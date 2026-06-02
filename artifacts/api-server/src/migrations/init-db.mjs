/**
 * Supabase Database Migrations
 * Run this file with: node src/migrations/init-db.mjs
 * Or add it to your package.json scripts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const migrations = [
  {
    name: 'Create users table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        displayName VARCHAR(255) NOT NULL,
        tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'premium+', 'gold', 'verified')),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      );
    `,
  },
  {
    name: 'Create index on username',
    sql: `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
  },
  {
    name: 'Enable RLS (Row Level Security)',
    sql: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'Create RLS policy - users can read their own data',
    sql: `
      CREATE POLICY "Users can read own data" ON users
      FOR SELECT USING (auth.uid()::text = id::text);
    `,
  },
  {
    name: 'Create RLS policy - service role can do everything',
    sql: `
      CREATE POLICY "Service role can access all" ON users
      AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
    `,
  },
];

async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...\n');

  for (const migration of migrations) {
    try {
      console.log(`⏳ Running: ${migration.name}`);
      
      const { error } = await client.rpc('exec', { sql: migration.sql }).catch(() => ({
        error: { message: 'Direct SQL execution not available' },
      }));

      if (error && error.message.includes('not available')) {
        // Fallback: just verify table exists via query
        if (migration.name.includes('Create users table')) {
          const { error: tableError } = await client.from('users').select('id').limit(1);
          if (!tableError || tableError.code === 'PGRST116') {
            console.log(
              '⚠️  Supabase requires manual SQL execution. Please run this SQL in your Supabase dashboard:\n'
            );
            console.log('📋 SQL:');
            console.log(migration.sql);
            console.log('\n---\n');
            return;
          } else {
            console.log(`✅ ${migration.name}`);
          }
        } else {
          console.log(`⏭️  Skipped: ${migration.name} (requires manual execution)`);
        }
      } else if (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.error(`❌ Failed: ${migration.name}`);
          console.error(error);
        } else {
          console.log(`✅ ${migration.name} (already exists)`);
        }
      } else {
        console.log(`✅ ${migration.name}`);
      }
    } catch (err) {
      console.error(`❌ Error running migration: ${migration.name}`);
      console.error(err);
    }
  }

  console.log('\n✨ Migration check complete!');
}

runMigrations().catch((err) => {
  console.error('Fatal error during migrations:', err);
  process.exit(1);
});
