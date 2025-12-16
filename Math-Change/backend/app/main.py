from fastapi import FastAPI, HTTPException, Body, Depends
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

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def check_db_connection():
    # Validation happens in database.py import
    if not supabase:
        raise RuntimeError("Supabase connection failed")

@app.get("/")
def read_root():
    return {"message": "Math-Change Backend API"}

# --- USERS ---

@app.post("/login")
def login(credentials: UserLogin):
    # Retrieve user by email
    response = supabase.table("users").select("*").eq("email", credentials.email).execute()
    users = response.data
    
    if not users:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    user_data = users[0]
    
    if user_data.get("status") == "BANNED":
        raise HTTPException(status_code=403, detail="Esta cuenta ha sido desactivada.")
        
    # Verify password (HASHED)
    if not user_data.get("password") or not verify_password(credentials.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")
        
    # Update last login
    now = datetime.utcnow().isoformat()
    supabase.table("users").update({"lastLogin": now}).eq("id", user_data["id"]).execute()
    user_data["lastLogin"] = now
    
    # Generate JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["email"], "id": user_data["id"], "role": user_data.get("role", "USER")},
        expires_delta=access_token_expires
    )
    
    # Return user without password
    user_data.pop("password", None)
    return {
        "success": True, 
        "user": user_data,
        "token": access_token
    }

@app.post("/register")
def register(user: UserCreate):
    # Check if exists
    res = supabase.table("users").select("*").eq("email", user.email).execute()
    if res.data:
        return {"success": False, "message": "El correo ya está registrado."}
    
    # Create new user - use model_dump for Pydantic v2
    try:
        user_dict = user.model_dump() if hasattr(user, 'model_dump') else user.dict()
    except Exception:
        user_dict = dict(user)
    
    # HASH PASSWORD
    user_dict["password"] = get_password_hash(user_dict["password"])
    
    user_dict["id"] = str(uuid.uuid4())
    user_dict["createdAt"] = datetime.utcnow().isoformat()
    
    # Ensure settings is a proper dict
    if user_dict.get("settings") is None:
        user_dict["settings"] = {}
    elif hasattr(user_dict["settings"], "dict"):
         user_dict["settings"] = user_dict["settings"].dict()

    # Pre-generate Token for auto-login after register
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["email"], "id": user_dict["id"], "role": user_dict.get("role", "USER")},
        expires_delta=access_token_expires
    )
        
    # Insert
    try:
        insert_res = supabase.table("users").insert(user_dict).execute()
        
        if insert_res.data:
            created_user = insert_res.data[0]
            created_user.pop("password", None)
            return {
                "success": True, 
                "user": created_user,
                "token": access_token
            }
        return {"success": False, "message": "Error creating user - no data returned"}
    except Exception as e:
        print(f"Registration error: {e}")
        return {"success": False, "message": f"Database error: {str(e)}"}

@app.get("/users")
def get_all_users(admin_user: dict = Depends(get_admin_user)):
    res = supabase.table("users").select("*").execute()
    return res.data

@app.post("/users")
def save_user(user: dict = Body(...), current_user: dict = Depends(get_current_user)):
    # Upsert logic
    # If ID exists, update. If not, insert? Frontend sends full object.
    # Usually used for updating settings or level.
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
        
    # We can use upsert
    res = supabase.table("users").upsert(user).execute()
    return res.data[0] if res.data else {}

# --- SCORES ---

@app.get("/scores")
def get_scores(user: Optional[str] = None):
    query = supabase.table("scores").select("*")
    if user:
        # Case insensitive usually handled by DB, here precise match or assume normalized
        query = query.eq("user", user)
    
    res = query.execute()
    return res.data

@app.post("/scores")
def save_score(record: ScoreRecord, current_user: dict = Depends(get_current_user)):
    data = record.dict()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
        
    res = supabase.table("scores").insert(data).execute()
    return res.data[0] if res.data else {}
