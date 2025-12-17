
import os
import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Load env vars
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CATEGORIES = ["sumas", "restas", "tablas", "divisiones"]
DIFFICULTIES = ["easy", "medium", "hard"]

USERS_DATA = [
    {
        "username": "prueba1",
        "email": "prueba1@test.com",
        "level": 5,
        "skill": "mixed", # Good at sumas, bad at divisiones
        "games_count": 20
    },
    {
        "username": "prueba2",
        "email": "prueba2@test.com",
        "level": 2,
        "skill": "beginner", # Low scores, high time
        "games_count": 10
    },
    {
        "username": "prueba3",
        "email": "prueba3@test.com",
        "level": 10,
        "skill": "expert", # Perfect scores, fast
        "games_count": 30
    }
]

def create_users():
    print("Creating users...")
    created_users = []
    
    for u in USERS_DATA:
        # Check if exists
        res = supabase.table("users").select("*").eq("username", u["username"]).execute()
        if res.data:
            print(f"User {u['username']} already exists. Using existing ID.")
            created_users.append({**u, "id": res.data[0]["id"]})
            continue

        # Create
        user_id = str(uuid.uuid4())
        new_user = {
            "id": user_id,
            "username": u["username"],
            "email": u["email"],
            "role": "USER",
            "status": "ACTIVE",
            "createdAt": datetime.now().isoformat(),
            "password": "", # Required by schema
            "unlockedLevel": u["level"],
            "settings": {},
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={u['username']}" # Dummy avatar
        }
        
        try:
            supabase.table("users").insert(new_user).execute()
            print(f"Created user: {u['username']}")
            created_users.append({**u, "id": user_id})
        except Exception as e:
            print(f"Error creating {u['username']}: {e}")

    return created_users

def generate_score(user, date_offset_days):
    category = random.choice(CATEGORIES)
    difficulty = random.choice(DIFFICULTIES)
    
    base_score = 0
    correct = 0
    error = 0
    avg_time = 0
    
    if user["skill"] == "expert":
        correct = random.randint(18, 20)
        error = random.randint(0, 2)
        base_score = correct * 100
        avg_time = random.uniform(1.5, 4.0)
    elif user["skill"] == "beginner":
        correct = random.randint(5, 12)
        error = random.randint(5, 10)
        base_score = correct * 50
        avg_time = random.uniform(8.0, 15.0)
    else: # mixed
        if category == "sumas":
            correct = random.randint(15, 20)
            error = random.randint(0, 5)
            avg_time = random.uniform(3.0, 6.0)
        else:
            correct = random.randint(8, 15)
            error = random.randint(3, 8)
            avg_time = random.uniform(5.0, 10.0)
        base_score = correct * 80

    total_q = correct + error
    # Ensure at least 1 Q
    if total_q == 0: total_q = 1; correct=1
    
    date = (datetime.now() - timedelta(days=date_offset_days)).isoformat()

    return {
        # "user_id": user["id"], # Removed as column does not exist
        "user": user["username"], 
        "score": base_score,
        "correctCount": correct,
        "errorCount": error,
        "avgTime": round(avg_time, 2),
        "category": category,
        "difficulty": difficulty,
        "date": date
    }

def seed_scores(users):
    print("Seeding scores...")
    scores_to_insert = []
    
    for user in users:
        print(f"Generating {user['games_count']} games for {user['username']}...")
        for i in range(user['games_count']):
            # Distribute dates over last 30 days
            days_ago = random.randint(0, 30)
            score = generate_score(user, days_ago)
            scores_to_insert.append(score)
            
    # Batch insert? specific supabase-py might differ.
    # Let's do one by one or chunks to be safe.
    count = 0
    for s in scores_to_insert:
        try:
            supabase.table("scores").insert(s).execute()
            count += 1
        except Exception as e:
            print(f"Error inserting score: {e}")
            
    print(f"Successfully inserted {count} score records.")

if __name__ == "__main__":
    users = create_users()
    seed_scores(users)
    print("Seeding complete!")
