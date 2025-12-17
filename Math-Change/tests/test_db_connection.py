import os
import psycopg2
from dotenv import load_dotenv
import sys

load_dotenv()

# These variables are injected by Docker or .env
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
DB_USER = "postgres.ixbgoxinxmntqcyrkusx"
DB_NAME = "postgres"
DB_PORT = "6543"

# Alternative direct connection
DIRECT_HOST = "db.ixbgoxinxmntqcyrkusx.supabase.co"
DIRECT_PORT = "5432"

def test_connection():
    print("--- Testing Database Connection ---")
    
    # Method 1: Direct Connection (Port 5432)
    print(f"\n[1] Attempting DIRECT connection to {DIRECT_HOST}:{DIRECT_PORT}...")
    try:
        conn = psycopg2.connect(
            host=DIRECT_HOST,
            database=DB_NAME,
            user="postgres", 
            password=DB_PASSWORD,
            port=DIRECT_PORT,
            connect_timeout=10
        )
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ SUCCESS! DB Version: {version}")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Direct connection FAILED: {e}")

    # Method 2: Pooler Connection (Port 6543)
    print(f"\n[2] Attempting POOLER connection to {DB_HOST}:{DB_PORT}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            connect_timeout=10
        )
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ SUCCESS! DB Version: {version}")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Pooler connection FAILED: {e}")
    
    return False

if __name__ == "__main__":
    if test_connection():
        print("\n--- TEST PASSED: Backend can talk to Supabase ---")
        sys.exit(0)
    else:
        print("\n--- TEST FAILED: Could not connect to Supabase ---")
        sys.exit(1)
