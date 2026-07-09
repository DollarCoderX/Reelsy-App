#!/usr/bin/env node
/**
 * Reelsy — Supabase Setup Script
 *
 * Run this once to create all required tables, indexes, and RLS policies.
 *
 * Usage:
 *   node scripts/supabase-setup.js
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from environment variables.
 * You can also pass a .env file path as the first argument:
 *   node scripts/supabase-setup.js artifacts/api-server/.env
 */

const fs = require("fs");
const path = require("path");

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = process.argv[2] || path.join(__dirname, "../artifacts/api-server/.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log(`✅ Loaded env from ${envPath}`);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  console.error("   Set them in environment or pass path to .env file.");
  process.exit(1);
}

// ── SQL statements ─────────────────────────────────────────────────────────────
const SQL_STATEMENTS = [
  // ── conversations ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT
  );`,

  // ── conversation_participants ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
  );`,

  // ── messages ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    sender_avatar TEXT,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT now(),
    read_by TEXT[] DEFAULT '{}'
  );`,

  // ── indexes ───────────────────────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_time
    ON messages(conversation_id, created_at DESC);`,

  `CREATE INDEX IF NOT EXISTS idx_participants_user
    ON conversation_participants(user_id);`,

  `CREATE INDEX IF NOT EXISTS idx_conversations_last_message
    ON conversations(last_message_at DESC NULLS LAST);`,

  // ── RLS ───────────────────────────────────────────────────────────────────
  `ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`,

  // Service role bypasses RLS automatically — policies for anon (frontend Realtime)
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='anon_read_conversations'
     ) THEN
       CREATE POLICY anon_read_conversations ON conversations
         FOR SELECT TO anon USING (true);
     END IF;
   END$$;`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename='conversation_participants' AND policyname='anon_read_participants'
     ) THEN
       CREATE POLICY anon_read_participants ON conversation_participants
         FOR SELECT TO anon USING (true);
     END IF;
   END$$;`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='anon_read_messages'
     ) THEN
       CREATE POLICY anon_read_messages ON messages
         FOR SELECT TO anon USING (true);
     END IF;
   END$$;`,

  // ── Enable Realtime publication ───────────────────────────────────────────
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
     ) THEN
       ALTER PUBLICATION supabase_realtime ADD TABLE messages;
     END IF;
   END$$;`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
     ) THEN
       ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
     END IF;
   END$$;`,
];

// ── Run SQL via Supabase REST /rest/v1/rpc or pg_dump ─────────────────────────
// Supabase doesn't expose raw SQL exec via REST unless you create a custom RPC.
// We use the management API (available to service key via /rest/v1/) to run
// migrations by POSTing to the Postgres REST endpoint via pg_dump workaround.
//
// Best approach: use the Supabase SQL API endpoint with service key.
async function runSQL(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (res.status === 404) {
    // exec_sql RPC doesn't exist — try creating tables via Supabase management API
    return { ok: false, needsManagementAPI: true };
  }

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }

  return { ok: true };
}

async function runSQLViaManagementAPI(sql, projectRef) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }

  return { ok: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Reelsy — Supabase Setup Script");
  console.log("━".repeat(50));
  console.log(`   URL: ${SUPABASE_URL}`);

  // Extract project ref from URL (https://<ref>.supabase.co)
  const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
  console.log(`   Project ref: ${projectRef}\n`);

  // First try exec_sql RPC (needs to exist in your Supabase project)
  const testResult = await runSQL("SELECT 1");
  const useManagementAPI = testResult.needsManagementAPI;

  if (useManagementAPI) {
    console.log("ℹ️  exec_sql RPC not found — using Supabase Management API instead.");
    console.log("   (This requires your service key to have project management access)\n");
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i].trim();
    const preview = sql.split("\n")[0].slice(0, 60) + (sql.length > 60 ? "..." : "");
    process.stdout.write(`[${i + 1}/${SQL_STATEMENTS.length}] ${preview} `);

    let result;
    if (useManagementAPI) {
      result = await runSQLViaManagementAPI(sql, projectRef);
    } else {
      result = await runSQL(sql);
    }

    if (result.ok) {
      console.log("✅");
      successCount++;
    } else {
      console.log("❌");
      if (result.error) console.error("   Error:", result.error.slice(0, 200));
      failCount++;
    }
  }

  console.log("\n" + "━".repeat(50));
  console.log(`✅ ${successCount} succeeded   ❌ ${failCount} failed`);

  if (failCount > 0) {
    console.log(`
⚠️  Some statements failed. If exec_sql RPC is not found, you can run the SQL
   directly in your Supabase dashboard:

   1. Go to https://supabase.com/dashboard/project/${projectRef}/sql/new
   2. Paste and run each statement from scripts/supabase-setup.js

   Or create the exec_sql function first:

   CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
   RETURNS void LANGUAGE plpgsql AS $$
   BEGIN EXECUTE sql; END;
   $$;
`);
  } else {
    console.log("\n🎉 All tables, indexes, and policies created successfully!\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
