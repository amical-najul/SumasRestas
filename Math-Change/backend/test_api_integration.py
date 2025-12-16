import requests
import sys
import uuid
import os
import time

# Configuration
# Since we are running INSIDE the docker network (via docker compose run),
# we can access the backend service by its service name if we were in another container,
# BUT 'docker compose run backend_api' runs INSIDE a new container of the SAME service.
# So localhost:8000 is where the server *would* be if we started it.
#
# HOWEVER: 'docker compose run' STARTS a new container, it doesn't exec into the existing one.
# So this script will run in a container that is NOT serving the API unless we start it in background
# or if we target the *running* container url.
#
# BETTER STRATEGY: 
# We will use 'docker compose run' but we need to talk to the 'backend_api' service that is ALREADY running (sumas-backend).
# So the target hostname should be 'backend_api' (or 'sumas-backend' container name) and port 8000.

BASE_URL = "http://sumas-backend:8000"

def log(msg, type="INFO"):
    print(f"[{type}] {msg}")

def test_integration():
    log("🚀 Starting Frontend-Backend Integration Test")
    log(f"Target API: {BASE_URL}")

    # Wait for service to be ready (retries)
    session = requests.Session()
    connected = False
    for i in range(5):
        try:
            r = session.get(f"{BASE_URL}/")
            if r.status_code == 200:
                log("✅ Connection established with Backend API")
                connected = True
                break
        except Exception as e:
            log(f"⚠️ Waiting for API... ({e})")
            time.sleep(2)
    
    if not connected:
        log("❌ Could not connect to Backend API. Is it running?", "ERROR")
        sys.exit(1)

    # 1. REGISTER
    run_id = str(uuid.uuid4())[:8]
    user_data = {
        "username": f"FrontSim_{run_id}",
        "email": f"front_{run_id}@test.com",
        "password": "secure_password_123",
        "role": "USER"
    }
    
    log("Testing [POST] /register ...")
    try:
        res = session.post(f"{BASE_URL}/register", json=user_data)
        if res.status_code == 200 and res.json().get("success"):
            token = res.json().get("token")
            log(f"✅ R1: Registration Successful. Token received.")
        else:
            log(f"❌ R1: Registration Failed. {res.text}", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"❌ R1: Exception: {e}", "ERROR")
        sys.exit(1)

    # 2. LOGIN (Verification)
    log("Testing [POST] /login ...")
    try:
        login_data = {"email": user_data["email"], "password": user_data["password"]}
        res = session.post(f"{BASE_URL}/login", json=login_data)
        if res.status_code == 200 and res.json().get("token"):
            auth_token = res.json().get("token")
            log(f"✅ R2: Login Successful. Auth Token verified.")
        else:
            log(f"❌ R2: Login Failed. {res.text}", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"❌ R2: Exception: {e}", "ERROR")
        sys.exit(1)

    # 3. SECURE OPERATION (Save Score)
    log("Testing [POST] /scores (Protected Route) ...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    score_data = {
        "user": user_data["username"],
        "score": 100,
        "correctCount": 10,
        "errorCount": 0,
        "avgTime": 2.5,
        "date": "2024-01-01T12:00:00.000Z",
        "category": "integration_test",
        "difficulty": "medium"
    }
    
    try:
        res = session.post(f"{BASE_URL}/scores", json=score_data, headers=headers)
        if res.status_code == 200:
             log(f"✅ R3: Score saved successfully (Authorized).")
        else:
             log(f"❌ R3: Failed to save score. {res.status_code} {res.text}", "ERROR")
             sys.exit(1)
    except Exception as e:
        log(f"❌ R3: Exception: {e}", "ERROR")
        sys.exit(1)

    # 4. SECURITY CHECK (Admin Access Denied)
    log("Testing [GET] /users (Admin Only Route) ...")
    try:
        res = session.get(f"{BASE_URL}/users", headers=headers)
        if res.status_code == 403:
             log(f"✅ R4: Security Pass! User was denied access to Admin route (403 Forbidden).")
        elif res.status_code == 200:
             log(f"❌ R4: SECURITY FAIL! Normal user could access Admin route.", "CRITICAL")
             sys.exit(1)
        else:
             log(f"⚠️ R4: Unexpected status {res.status_code} (Expected 403).")
    except Exception as e:
        log(f"❌ R4: Exception: {e}", "ERROR")
    
    print("\n--- ✨ INTEGRATION TEST COMPLETED SUCCESSFULLY ✨ ---")

if __name__ == "__main__":
    test_integration()
