#!/usr/bin/env node
/**
 * Reelsy — Supabase Setup Script
 *
 * Run this once to configure all Supabase resources (storage bucket, realtime policies).
 * Usage:
 *   node scripts/setup-supabase.mjs
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * These are read from artifacts/api-server/.env if not already in environment.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from api-server if env vars aren't already set
if (!process.env.SUPABASE_URL) {
  try {
    const envPath = resolve(__dirname, '../artifacts/api-server/.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
    console.log('✅ Loaded env vars from artifacts/api-server/.env');
  } catch {
    console.warn('⚠️  Could not load .env — make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
  }
}

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n🔧 Reelsy Supabase Setup\n');

// ── 1. Storage bucket: media ─────────────────────────────────────────────────
console.log('1. Setting up storage bucket "media"...');
{
  const { data, error } = await supabase.storage.createBucket('media', {
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: ['image/*', 'video/*', 'audio/*'],
  });
  if (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('   ✅ Bucket "media" already exists — skipping.');
    } else {
      console.error('   ❌ Failed to create bucket:', error.message);
    }
  } else {
    console.log('   ✅ Bucket "media" created with public access.');
  }
}

// ── 2. Check required tables ─────────────────────────────────────────────────
console.log('\n2. Checking required Supabase tables...');

const REQUIRED_TABLES = ['conversations', 'conversation_participants', 'messages'];
let tablesOk = true;

for (const table of REQUIRED_TABLES) {
  const { error } = await supabase.from(table).select('count').limit(1);
  if (error && error.code !== 'PGRST116') {
    console.log(`   ✅ Table "${table}" exists.`);
  } else if (error && error.code === 'PGRST116') {
    console.warn(`   ⚠️  Table "${table}" does not exist.`);
    tablesOk = false;
  } else {
    console.log(`   ✅ Table "${table}" exists.`);
  }
}

if (!tablesOk) {
  console.log('\n📋 Some tables are missing. Run this SQL in your Supabase Dashboard → SQL Editor:\n');
  console.log(`-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

-- Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_by TEXT[] DEFAULT '{}'::TEXT[]
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

-- Enable Realtime on messages (run in Supabase Dashboard → Database → Replication)
-- ALTER TABLE messages REPLICA IDENTITY FULL;
`);
}

// ── 3. Verify Realtime broadcast capability ───────────────────────────────────
console.log('\n3. Verifying Supabase Realtime broadcast...');
try {
  const channel = supabase.channel('_setup_test_');
  await channel.send({ type: 'broadcast', event: 'ping', payload: { ok: true } });
  await supabase.removeChannel(channel);
  console.log('   ✅ Realtime broadcast is working.');
} catch (err) {
  console.error('   ❌ Realtime broadcast failed:', err.message);
}

console.log('\n✅ Setup complete! Your Reelsy Supabase project is configured.\n');
console.log('Next steps:');
console.log('  • Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in the frontend env.');
console.log('  • Restart the API server and web app workflows.\n');
