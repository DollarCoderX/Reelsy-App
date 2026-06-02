-- Reelsy Supabase Database Schema
-- Copy and paste this into your Supabase SQL Editor to create the required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'premium+', 'gold', 'verified')),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (auth.uid()::text = id::text);

-- Allow service role (backend) to do everything
CREATE POLICY "Service role can access all" ON users
AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert a test user (optional - for development)
-- INSERT INTO users (id, username, displayName, tier)
-- VALUES (
--   uuid_generate_v4(),
--   'testuser',
--   'Test User',
--   'free'
-- );
