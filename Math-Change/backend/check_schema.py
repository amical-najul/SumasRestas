
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials")
    exit(1)

supabase = create_client(url, key)

try:
    # Fetch 1 record (or empty) to check structure if possible, or just list columns?
    # Supabase doesn't easily list columns via client, but we can try inserting dummy and see error, or select.
    # Let's try selecting.
    res = supabase.table("scores").select("*").limit(1).execute()
    print("Success:", res.data)
    if res.data:
        print("Keys:", res.data[0].keys())
    else:
        print("Table is empty but query worked.")
        
        # Try inserting a dummy with camelCase keys to test
        dummy = {
            "id": "test_schema_check",
            "user": "schema_bot",
            "score": 100,
            "correctCount": 10,
            "errorCount": 0,
            "avgTime": 1.5,
            "date": "2024-01-01",
            "category": "test",
            "difficulty": "test"
        }
        try:
            res_ins = supabase.table("scores").insert(dummy).execute()
            print("Insert CamelCase Success")
            # Cleanup
            supabase.table("scores").delete().eq("id", "test_schema_check").execute()
        except Exception as e:
            print(f"Insert CamelCase Failed: {e}")
            
except Exception as e:
    print(f"Error: {e}")
