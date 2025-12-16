from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
from models import User, UserCreate, UserLogin, ScoreRecord
from datetime import datetime
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

# Supabase Setup - Using SERVICE ROLE KEY to bypass RLS
url: str = os.environ.get("SUPABASE_URL")
# CRITICAL: Use Service Role Key to bypass Row Level Security
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key) if url and key else None

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
        
    # Verify password (SIMULATED/PLAIN TEXT as per current frontend requirement)
    if user_data.get("password") != credentials.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")
        
    # Update last login
    now = datetime.utcnow().isoformat()
    supabase.table("users").update({"lastLogin": now}).eq("id", user_data["id"]).execute()
    user_data["lastLogin"] = now
    
    # Return user without password
    # user_data.pop("password", None) # Optional safety, but frontend might expect it? 
    # Frontend types.ts has 'password' in User interface. 
    # We will include it if the frontend Logic checks it again, but usually login service returns User.
    # Safe practice: don't return password. But strict interface matching might require it.
    # Let's return it as the frontend mock did return the full User object.
    return {"success": True, "user": user_data}

@app.post("/register")
def register(user: UserCreate):
    # Check if exists
    res = supabase.table("users").select("*").eq("email", user.email).execute()
    if res.data:
        return {"success": False, "message": "El correo ya está registrado."}
    
    # Create new user - use model_dump for Pydantic v2, or dict() for v1
    try:
        new_user = user.model_dump() if hasattr(user, 'model_dump') else user.dict()
    except Exception:
        new_user = dict(user)
    
    new_user["id"] = str(uuid.uuid4())
    new_user["createdAt"] = datetime.utcnow().isoformat()
    
    # Ensure settings is a proper dict (not None or Pydantic model)
    if new_user.get("settings") is None:
        new_user["settings"] = {}
    elif hasattr(new_user["settings"], "model_dump"):
        new_user["settings"] = new_user["settings"].model_dump()
    elif hasattr(new_user["settings"], "dict"):
        new_user["settings"] = new_user["settings"].dict()
        
    # Insert
    try:
        insert_res = supabase.table("users").insert(new_user).execute()
        
        if insert_res.data:
            return {"success": True, "user": insert_res.data[0]}
        return {"success": False, "message": "Error creating user - no data returned"}
    except Exception as e:
        print(f"Registration error: {e}")
        return {"success": False, "message": f"Database error: {str(e)}"}

@app.get("/users")
def get_all_users():
    res = supabase.table("users").select("*").execute()
    return res.data

@app.post("/users")
def save_user(user: dict = Body(...)):
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
def save_score(record: ScoreRecord):
    data = record.dict()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
        
    res = supabase.table("scores").insert(data).execute()
    return res.data[0] if res.data else {}
