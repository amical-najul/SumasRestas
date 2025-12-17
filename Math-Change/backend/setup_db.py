import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Supabase Postgres Connection Details
# These are derived from the project settings provided
DB_HOST = "aws-0-us-east-1.pooler.supabase.com" # Transaction pooler usually safer, or direct db.ref.supabase.co
# Let's try direct connection first as it supports Session mode for DDL better often, 
# but for Supabase recent setups, the pooler is often port 6543.
# Connection string format: postgres://[user]:[password]@[host]:[port]/[dbname]
# User provided: 
# Project ID: ixbgoxinxmntqcyrkusx
# Password: [REDACTED_FROM_GIT]

DB_USER = "postgres.ixbgoxinxmntqcyrkusx"
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = "postgres"
DB_PORT = "6543" # Default pooler port, or 5432 for direct if allowed

# Try constructing connection string
# We'll default to the standard pooler host for this region/project if possible, 
# or use the generic pattern `db.[project_ref].supabase.co`
DIRECT_HOST = "db.ixbgoxinxmntqcyrkusx.supabase.co"
DIRECT_PORT = "5432"

def run_schema():
    print("Attempting to connect to Supabase Database...")
    
    try:
        # Try direct connection first (better for DDL)
        conn = psycopg2.connect(
            host=DIRECT_HOST,
            database=DB_NAME,
            user="postgres", # Direct connection often uses just 'postgres' with the password
            password=DB_PASSWORD,
            port=DIRECT_PORT
        )
    except Exception as e:
        print(f"Direct connection failed: {e}")
        print("Retrying with Pooler connection settings...")
        try:
             conn = psycopg2.connect(
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                port=DB_PORT
            )
        except Exception as e2:
            print(f"Connection failed: {e2}")
            return

    print("Connected successfully. Applying schema...")
    
    try:
        cursor = conn.cursor()
        
        # Read schema file
        with open("schema.sql", "r") as f:
            schema_sql = f.read()
            
        cursor.execute(schema_sql)
        conn.commit()
        print("Schema applied successfully!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error applying schema: {e}")

if __name__ == "__main__":
    run_schema()
