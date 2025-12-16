-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Storing plain text as requested for simulation
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'ACTIVE',
    avatar TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastLogin" TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    "unlockedLevel" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user" TEXT NOT NULL, -- Stores username
    score INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "avgTime" FLOAT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    category TEXT,
    difficulty TEXT
);

-- Enable Row Level Security (RLS) if needed, but for now we leave it open or public for the API key to access.
-- Ideally, you should enable RLS and add policies.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow public access (Anon key) for now since we are managing auth via our own backend endpoints or just direct client usage
-- Actually, since backend uses Service Key or Anon Key, it will work. 
-- BUT if we use Anon Key from backend, we need policies. Service Key bypasses RLS.
-- The provided key 'sb_publishable...' is Anon. 'sb_secret...' is Service Role.
-- Our backend uses both? The .env has both. 
-- Implementation Plan said "Backend uses Supabase Client".
-- If using Service Role Key in backend, we don't need policies.
-- Let's ensure strict access if possible, or just allow all for the service role (default).
