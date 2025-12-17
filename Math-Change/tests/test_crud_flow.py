import os
import sys
import uuid
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from the project root
load_dotenv(dotenv_path='../.env') 
load_dotenv(dotenv_path='./.env')  # Fallback if running from root
load_dotenv()  # Fallback to current dir

# Configuration
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    print(f"   Found URL: {'Yes' if URL else 'No'}")
    print(f"   Found KEY: {'Yes' if KEY else 'No'}")
    sys.exit(1)

def run_test():
    print(f"--- 🚀 Starting local DB CRUD Test ---")
    print(f"Target: {URL}")
    
    try:
        supabase: Client = create_client(URL, KEY)
    except Exception as e:
        print(f"❌ CRITICAL: Failed to initialize Supabase client: {e}")
        sys.exit(1)

    # DATA PREP
    run_id = str(uuid.uuid4())[:8]
    test_email = f"test_crud_{run_id}@example.com"
    test_id = str(uuid.uuid4())
    
    user_data = {
        "id": test_id,
        "username": f"TestBot_{run_id}",
        "email": test_email,
        "password": "hashed_secret_password_simulation", # simulacion
        "role": "TESTER",
        "status": "ACTIVE",
        "unlockedLevel": 0,
        "createdAt": "2024-01-01T12:00:00.000000",
        "settings": {"test_run": True}
    }

    # STEP 1: CREATE
    print(f"\n[1/4] Attempting INSERT user {test_email}...")
    try:
        data = supabase.table("users").insert(user_data).execute()
        if data.data and data.data[0]['id'] == test_id:
            print("   ✅ INSERT Successful")
        else:
            print(f"   ❌ INSERT Failed: No data returned. Response: {data}")
            sys.exit(1)
    except Exception as e:
        print(f"   ❌ INSERT Exception: {e}")
        sys.exit(1)

    # STEP 2: READ
    print(f"\n[2/4] Attempting SELECT by email...")
    try:
        res = supabase.table("users").select("*").eq("email", test_email).execute()
        fetched_user = res.data[0] if res.data else None
        
        if fetched_user and fetched_user['username'] == user_data['username']:
            print("   ✅ READ Successful")
        else:
            print("   ❌ READ Failed: User not found or mismatch")
            sys.exit(1)
    except Exception as e:
        print(f"   ❌ READ Exception: {e}")
        sys.exit(1)

    # STEP 3: UPDATE
    print(f"\n[3/4] Attempting UPDATE (unlockedLevel 0 -> 5)...")
    try:
        res = supabase.table("users").update({"unlockedLevel": 5}).eq("id", test_id).execute()
        updated_user = res.data[0] if res.data else None
        
        if updated_user and updated_user['unlockedLevel'] == 5:
            print("   ✅ UPDATE Successful")
        else:
            print("   ❌ UPDATE Failed: Data not updated")
            sys.exit(1)
    except Exception as e:
        print(f"   ❌ UPDATE Exception: {e}")
        sys.exit(1)

    # STEP 4: DELETE (Cleanup)
    print(f"\n[4/4] Attempting DELETE cleanup...")
    try:
        res = supabase.table("users").delete().eq("id", test_id).execute()
        # Verify deletion
        check = supabase.table("users").select("*").eq("id", test_id).execute()
        if not check.data:
            print("   ✅ DELETE Successful")
        else:
            print("   ⚠️ DELETE Warning: User still exists")
    except Exception as e:
        print(f"   ❌ DELETE Exception: {e}")

    print("\n--- ✨ TEST COMPLETED SUCCESSFULLY ✨ ---")

if __name__ == "__main__":
    run_test()
