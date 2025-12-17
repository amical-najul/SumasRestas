from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserSettings(BaseModel):
    customTimers: Optional[Dict[str, int]] = None
    unlockedLevels: Optional[Dict[str, int]] = {} # Category -> Max Unlocked Level Index

class UserBase(BaseModel):
    username: str
    email: str
    role: str = "USER"
    status: str = "ACTIVE"
    avatar: Optional[str] = None
    settings: Optional[UserSettings] = None
    unlockedLevel: int = 0

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "USER"
    status: str = "ACTIVE"
    avatar: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}
    unlockedLevel: int = 0

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: str
    createdAt: str
    lastLogin: Optional[str] = None
    # Password is excluded from response

class ScoreRecord(BaseModel):
    id: Optional[str] = None # Optional for creation
    user: str # Username
    score: int
    correctCount: int
    errorCount: int
    avgTime: float
    date: str
    category: Optional[str] = None
    difficulty: Optional[str] = None
