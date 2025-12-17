from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
import httpx
import uuid
import json
from .database import supabase

load_dotenv()

# Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALGORITHM = "HS256"
# Firebase Project ID from env or fallback
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "fast-ingles")
GOOGLE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

# Constants for Legacy Config (Maintained for main.py imports)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

# Cache for Google Public Keys
_google_keys_cache = {}
_google_keys_expire = 0

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    # Legacy function - kept for compatibility if needed, though mostly unused now
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_google_keys():
    global _google_keys_cache, _google_keys_expire
    now = datetime.utcnow().timestamp()
    
    if _google_keys_cache and now < _google_keys_expire:
        return _google_keys_cache
        
    try:
        response = httpx.get(GOOGLE_KEYS_URL)
        if response.status_code == 200:
            # Cache-Control: public, max-age=24475, must-revalidate, no-transform
            cache_control = response.headers.get("Cache-Control", "")
            max_age = 3600 # Default 1 hour
            
            if "max-age=" in cache_control:
                try:
                    parts = cache_control.split(",")
                    for part in parts:
                        if "max-age=" in part:
                            max_age = int(part.strip().split("=")[1])
                except Exception:
                    pass
            
            _google_keys_cache = response.json()
            _google_keys_expire = now + max_age
            return _google_keys_cache
    except Exception as e:
        print(f"Error fetching Google keys: {e}")
        # If fetch fails but we have stale cache, return it
        if _google_keys_cache:
            return _google_keys_cache
            
    return {}

def verify_firebase_token(token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales de Firebase",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Get Header to find Key ID (kid)
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            print("No kid found in token header")
            raise credentials_exception
            
        keys = get_google_keys()
        if kid not in keys:
            print(f"Key ID {kid} not found in Google keys")
            # Force refresh just in case
            global _google_keys_expire
            _google_keys_expire = 0
            keys = get_google_keys()
            if kid not in keys:
                raise credentials_exception
        
        public_key = keys[kid]
        
        # Decode and verify
        # Audience must be our Firebase Project ID
        payload = jwt.decode(
            token, 
            public_key, 
            algorithms=["RS256"], 
            audience=FIREBASE_PROJECT_ID,
            options={"verify_exp": True}
        )
        
        return payload
        
    except JWTError as e:
        print(f"JWT Verification Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Token Verification Error: {e}")
        raise credentials_exception

def get_current_user(token: str = Depends(oauth2_scheme)):
    # This logic now handles Firebase ID Tokens
    
    # 1. Verify Token
    firebase_payload = verify_firebase_token(token)
    
    email = firebase_payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token no contiene email")
        
    # 2. Extract info
    # Firebase uid is in 'sub'
    # firebase_uid = firebase_payload.get("sub")
    
    # 3. Find or Create User in Database
    # We use EMAIL to link to existing users from the old system
    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        
        if res.data and len(res.data) > 0:
            # User exists
            return res.data[0]
        else:
            # JIT Provisioning: Create user if they don't exist
            # Note: We generate a new UUID for our DB ID, distinct from Firebase UID
            # (unless we want to migrate to using Firebase UID as PK, but that requires schema change)
            
            new_user_id = str(uuid.uuid4())
            now_iso = datetime.utcnow().isoformat()
            
            # Default username from email part
            username = firebase_payload.get("name", email.split("@")[0])
            
            new_user = {
                "id": new_user_id,
                "email": email,
                "username": username,
                "role": "USER",
                "status": "ACTIVE",
                "createdAt": now_iso,
                "password": "", # No password managed here anymore
                "settings": {},
                "unlockedLevel": 0
            }
            
            insert_res = supabase.table("users").insert(new_user).execute()
            
            if insert_res.data:
                return insert_res.data[0]
            else:
                raise HTTPException(status_code=500, detail="Error creando usuario local")
                
    except Exception as e:
        print(f"DB Error in get_current_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de base de datos"
        )

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de administrador"
        )
    return current_user
