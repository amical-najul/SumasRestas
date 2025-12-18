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
        # 1. Save Score Record
        res = supabase.table("scores").insert(data).execute()
        print(f"DEBUG: Save score success: {res.data}")
        
        # 2. Upsert Category Progress (Stats)
        # We need the user ID. 'current_user' has it.
        user_id = current_user.get("id")
        category = record.category
        
        if user_id and category:
            # Calculate stats to add
            # Note: Postgres upsert needs to handle the increment. 
            # Supabase/PostgREST doesn't support "increment on conflict" easily in one call via JS client syntax usually,
            # BUT we can call a stored procedure OR do two steps (read, calc, update).
            # For simplicity and robustness without migration of SPs, we will do Read-Modify-Write transaction logic here.
            # Ideally, RLS or DB Trigger is best, but we are doing logic in API.
            
            # Fetch existing
            existing = supabase.table("user_category_progress").select("*").eq("user_id", user_id).eq("category", category).execute()
            
            current_stats = existing.data[0] if existing.data else {
                "user_id": user_id,
                "category": category,
                "total_games": 0,
                "total_score": 0,
                "total_correct": 0,
                "total_errors": 0,
                "total_time_seconds": 0.0,
                "unlocked_level": 0
            }
            
            # Update values
            new_stats = {
                "user_id": user_id,
                "category": category,
                "total_games": current_stats.get("total_games", 0) + 1,
                "total_score": current_stats.get("total_score", 0) + record.score,
                "total_correct": current_stats.get("total_correct", 0) + record.correctCount,
                "total_errors": current_stats.get("total_errors", 0) + record.errorCount,
                "total_time_seconds": current_stats.get("total_time_seconds", 0.0) + (record.avgTime * (record.correctCount + record.errorCount)), # approx total time
                "last_played_at": datetime.utcnow().isoformat()
            }
            
            # Preserve unlocked_level if not provided (it is handled by separate endpoint usually, but let's keep it safe)
            if "unlocked_level" not in new_stats and "unlocked_level" in current_stats:
                new_stats["unlocked_level"] = current_stats["unlocked_level"]
                
            # Upsert
            supabase.table("user_category_progress").upsert(new_stats, on_conflict="user_id, category").execute()

        return res.data[0] if res.data else {}
    except Exception as e:
        print(f"ERROR: Failed to save score: {e}")
        # Continue to raise HTTP exception so frontend handles it? 
        # Or return empty to avoid crash? Better to raise to see in Network tab.
        raise HTTPException(status_code=500, detail=f"Database Insert Error: {str(e)}")

@app.get("/users/me/progress")
def get_my_progress(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    username = current_user.get("username")
    
    res = supabase.table("user_category_progress").select("*").eq("user_id", user_id).execute()
    
    # AUTO-MIGRATION: If no progress records but user has scores, calculate from history
    if not res.data and username:
        scores_res = supabase.table("scores").select("*").ilike("user", username).execute()
        
        if scores_res.data:
            # Group scores by category and calculate stats
            category_stats = {}
            difficulty_order = ['easy', 'easy_medium', 'medium', 'medium_hard', 'hard']
            
            for score in scores_res.data:
                cat = score.get("category")
                if not cat:
                    continue
                    
                if cat not in category_stats:
                    category_stats[cat] = {
                        "total_games": 0,
                        "total_score": 0,
                        "total_correct": 0,
                        "total_errors": 0,
                        "max_difficulty_passed": -1  # Track highest difficulty with >= 60%
                    }
                
                stats = category_stats[cat]
                stats["total_games"] += 1
                stats["total_score"] += score.get("score", 0)
                stats["total_correct"] += score.get("correctCount", 0)
                stats["total_errors"] += score.get("errorCount", 0)
                
                # Check if this score unlocks a level (>= 60%)
                if score.get("score", 0) >= 60:
                    diff = score.get("difficulty", "easy")
                    if diff in difficulty_order:
                        diff_idx = difficulty_order.index(diff)
                        if diff_idx > stats["max_difficulty_passed"]:
                            stats["max_difficulty_passed"] = diff_idx
            
            # Insert calculated progress records
            for cat, stats in category_stats.items():
                # unlocked_level = max_difficulty_passed + 1 (they passed level X, so X+1 is their current max)
                unlocked = stats["max_difficulty_passed"] + 1 if stats["max_difficulty_passed"] >= 0 else 0
                
                progress_data = {
                    "user_id": user_id,
                    "category": cat,
                    "unlocked_level": unlocked,
                    "total_games": stats["total_games"],
                    "total_score": stats["total_score"],
                    "total_correct": stats["total_correct"],
                    "total_errors": stats["total_errors"]
                }
                supabase.table("user_category_progress").upsert(progress_data, on_conflict="user_id, category").execute()
            
            # Re-fetch after migration
            res = supabase.table("user_category_progress").select("*").eq("user_id", user_id).execute()
    
    return res.data

from .models import CategoryLevelUpdate
@app.patch("/users/me/progress/level")
def update_level_progress(update: CategoryLevelUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    
    # Check existing to ensure we don't downgrade
    existing = supabase.table("user_category_progress").select("unlocked_level").eq("user_id", user_id).eq("category", update.category).execute()
    
    current_level = 0
    if existing.data:
        current_level = existing.data[0].get("unlocked_level", 0)
    
    if update.new_level > current_level:
        data = {
            "user_id": user_id,
            "category": update.category,
            "unlocked_level": update.new_level,
            "updated_at": datetime.utcnow().isoformat()
        }
        # Upsert to handle if row doesn't exist yet
        res = supabase.table("user_category_progress").upsert(data, on_conflict="user_id, category").execute()
        return res.data
    
    return {"message": "Level not updated (already higher or equal)"}

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

