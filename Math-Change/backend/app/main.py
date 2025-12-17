from fastapi import FastAPI, HTTPException, Body, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
from .models import User, UserCreate, UserLogin, ScoreRecord

from .database import supabase
from .auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_admin_user
from datetime import datetime, timedelta
import uuid
import boto3
import io
from PIL import Image, ImageOps

load_dotenv()

# S3 Configuration - MUST be set via environment variables
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY")
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")

app = FastAPI()

# SEC-004: Security Headers Middleware
# Can be disabled if handled by a Reverse Proxy (e.g., Traefik/Nginx)
if os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true":
    from fastapi import Request
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# CORS configuration
origins_str = os.environ.get("ALLOWED_ORIGINS", "*")
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def check_connections():
    # Validate Supabase
    if not supabase:
        raise RuntimeError("Supabase connection failed")
    
    # Warn about S3 config (non-fatal, only affects avatar upload)
    if not all([S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT_URL, S3_BUCKET_NAME]):
        print("WARNING: S3 configuration incomplete. Avatar upload will fail.")
        print("Set S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT_URL, S3_BUCKET_NAME in environment.")

@app.get("/")
def read_root():
    return {"message": "Math-Change Backend API"}

# --- USERS ---

# Legacy /login and /register endpoints removed. 
# Authentication is now handled via Firebase Auth.

@app.get("/users")
def get_all_users(admin_user: dict = Depends(get_admin_user)):
    res = supabase.table("users").select("*").execute()
    return res.data

@app.post("/users")
def save_user(user: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    # Security: Only Admin or Self can update
    # Note: get_current_user returns the user dict from DB
    if current_user["role"] != "ADMIN" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="No permission to update this user")

    # Prevent non-admins from changing role/status/unlockedLevel
    if current_user["role"] != "ADMIN":
        # Force keep original restricted fields
        user["role"] = current_user.get("role", "USER")
        user["status"] = current_user.get("status", "ACTIVE")
        # Allow unlockedLevel? usually calculated by backend. For now trust frontend if not critical.
        # Ideally unlockedLevel logic should be backend-side in /scores endpoint.

    # Upsert
    res = supabase.table("users").upsert(user).execute()
    return res.data[0] if res.data else {}

@app.delete("/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_admin_user)):
    # Only admins can delete (enforced by get_admin_user dependency)
    res = supabase.table("users").delete().eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o ya eliminado")
    return {"message": "Usuario eliminado correctamente", "id": user_id}

# --- SCORES ---

@app.get("/scores")
def get_scores(user: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = supabase.table("scores").select("*")
    if user:
        # Case insensitive match using ilike
        query = query.ilike("user", user)
    
    res = query.execute()
    return res.data

@app.post("/scores")
def save_score(record: ScoreRecord, current_user: dict = Depends(get_current_user)):
    # Use model_dump for Pydantic v2 compatibility
    data = record.model_dump() if hasattr(record, 'model_dump') else record.dict()
    # FORCE UUID: Frontend sends timestamp (Date.now()) which may fail if DB expects UUID
    data["id"] = str(uuid.uuid4())
        
    print(f"DEBUG: Attempting to save score: {data}")
    
    try:
        res = supabase.table("scores").insert(data).execute()
        print(f"DEBUG: Save score success: {res.data}")
        return res.data[0] if res.data else {}
    except Exception as e:
        print(f"ERROR: Failed to save score: {e}")
        # Continue to raise HTTP exception so frontend handles it? 
        # Or return empty to avoid crash? Better to raise to see in Network tab.
        raise HTTPException(status_code=500, detail=f"Database Insert Error: {str(e)}")

@app.delete("/scores")
def delete_scores(scope: str = "all", current_user: dict = Depends(get_current_user)):
    """
    Delete scores for the current user.
    scope: 'all' (default) deletes the entire history.
    """
    try:
        # Scores are linked by 'user' column which corresponds to username
        # TODO: Ideally should link by ID, but current schema uses username.
        username = current_user.get("username")
        if not username:
             raise HTTPException(status_code=400, detail="Cannot identify user for deletion")

        query = supabase.table("scores").delete().eq("user", username)
        
        # future: if scope == 'partial' ... logic
        
        res = query.execute()
        return {"message": "Historial eliminado correctamente", "count": len(res.data) if res.data else 0}
        
    except Exception as e:
        print(f"Error deleting scores: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting scores: {str(e)}")

@app.delete("/scores/{score_id}")
def delete_score_by_id(score_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a specific score by ID.
    """
    try:
        # Verify ownership
        # We need to check if the score belongs to the current user
        # Since RLS isn't strictly enforced for service role, we do it manually or assume 'user' column matches username
        username = current_user.get("username")
        
        # Verify first
        existing = supabase.table("scores").select("user").eq("id", score_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Puntuación no encontrada")
            
        if existing.data[0]["user"] != username and current_user.get("role") != "ADMIN":
             raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta puntuación")

        res = supabase.table("scores").delete().eq("id", score_id).execute()
        return {"message": "Puntuación eliminada", "id": score_id}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error deleting score {score_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando score: {str(e)}")

# --- CURRENT USER & AVATAR ---

@app.get("/users/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")

    # OPTIMIZATION START
    try:
        # Read file content
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Convert to RGB (in case of RGBA/P) to allow WebP conversion and consistency
        if image.mode in ('RGBA', 'P'):
             image = image.convert('RGB')
             
        # Resize/Crop to 500x500 (Cover logic)
        # ImageOps.fit crops the image to the specified aspect ratio and size
        image = ImageOps.fit(image, (500, 500), method=Image.Resampling.LANCZOS)
        
        # Save to WebP buffer
        buffer = io.BytesIO()
        # optimize=True helps reduce size further
        image.save(buffer, format="WEBP", quality=80, optimize=True)
        buffer.seek(0)
        
        # Update filename extension to .webp
        file_extension = "webp"
        content_type = "image/webp"
        
    except Exception as img_err:
        print(f"Image processing failed: {img_err}")
        raise HTTPException(status_code=422, detail="Error procesando la imagen. Asegúrese de subir un archivo válido.")

    # Generate unique filename
    filename = f"{current_user['id']}_{uuid.uuid4()}.{file_extension}"
    
    # DEBUG LOGS
    print(f"DEBUG: Starting upload for user {current_user['id']}")
    print(f"DEBUG: Bucket={S3_BUCKET_NAME}, Endpoint={S3_ENDPOINT_URL}")
    print(f"DEBUG: Key (first 5 chars)={S3_ACCESS_KEY[:5]}...")

    # Check S3 config before attempting upload
    if not all([S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT_URL, S3_BUCKET_NAME]):
        raise HTTPException(status_code=503, detail="Configuración S3 incompleta. Contacte al administrador.")
    
    s3 = boto3.client('s3',
                      endpoint_url=S3_ENDPOINT_URL,
                      aws_access_key_id=S3_ACCESS_KEY,
                      aws_secret_access_key=S3_SECRET_KEY,
                      region_name=S3_REGION)

    try:
        # Upload - Attempt 1
        s3.upload_fileobj(
            buffer,
            S3_BUCKET_NAME,
            filename,
            ExtraArgs={'ACL': 'public-read', 'ContentType': content_type}
        )
    except Exception as e:
        # Check for NoSuchBucket
        error_str = str(e)
        if "NoSuchBucket" in error_str or "The specified bucket does not exist" in error_str:
            print(f"WARN: Bucket {S3_BUCKET_NAME} does not exist. Attempting to create user bucket...")
            try:
                # Create Bucket
                region = os.environ.get("S3_REGION", "us-east-1")
                if region == "us-east-1":
                    s3.create_bucket(Bucket=S3_BUCKET_NAME)
                else:
                    s3.create_bucket(
                        Bucket=S3_BUCKET_NAME,
                        CreateBucketConfiguration={'LocationConstraint': region}
                    )
                print(f"INFO: Bucket {S3_BUCKET_NAME} created successfully.")
                
                # Reset file pointer
                buffer.seek(0)
                
                # Retry Upload
                s3.upload_fileobj(
                    buffer,
                    S3_BUCKET_NAME,
                    filename,
                    ExtraArgs={'ACL': 'public-read', 'ContentType': content_type}
                )
            except Exception as create_err:
                 print(f"CRITICAL: Failed to auto-create bucket: {create_err}")
                 raise HTTPException(status_code=500, detail=f"Error fatal S3: No existe el bucket y no se pudo crear: {str(create_err)}")
        else:
             print(f"ERROR: Upload error details: {e}")
             raise HTTPException(status_code=500, detail=f"Error subiendo imagen ({type(e).__name__}): {str(e)}")

    # Construct URL
    # FIX: Ensure URL is accessible. If using MinIO/Local S3, path style is safer.
    # Check if endpoint already ends with slash to avoid double slash
    base_url = S3_ENDPOINT_URL.rstrip('/')
    url = f"{base_url}/{S3_BUCKET_NAME}/{filename}"
    print(f"DEBUG: Upload success: {url}")
    
    # Update User in DB
    try:
        res = supabase.table("users").update({"avatar": url}).eq("id", current_user["id"]).execute()
    except Exception as db_err:
         print(f"WARN: Failed to update user profile in DB: {db_err}")
         # Attempt to return success anyway if upload worked
    
    return {"success": True, "url": url}

