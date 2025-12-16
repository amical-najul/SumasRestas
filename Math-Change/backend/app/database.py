import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase Setup
# Using service role key bypasses RLS, useful for backend administration
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("Supabase configuration missing (URL or KEY). check .env")

supabase: Client = create_client(url, key)

# NOTE: The user requested "disable prepared statements" for SQLAlchemy engines.
# This application uses 'supabase-py' which communicates via HTTP (REST),
# avoiding direct connection pooling issues (DuplicatePreparedStatementError) entirely.
# If SQLAlchemy is added in the future, usage of create_async_engine should include:
# connect_args={"prepared_statement_cache_size": 0}
