# 🚀 Quick Start - Supabase Database Setup

There are 3 ways to create your database tables. Pick the fastest one:

## Option 1: Automatic (Fastest if your SDK supports it)
```bash
cd artifacts/api-server
pnpm migrate
```
This will check your database and create tables if needed.

## Option 2: Manual SQL in Supabase Dashboard (Most Reliable)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `src/migrations/schema.sql`
5. Click **Run** button
6. Done! ✅

**That's it!** Your tables are created automatically.

## Option 3: Use Supabase CLI (If installed)
```bash
# Install globally (one time)
npm install -g supabase

# Push migrations
supabase migration up
```

---

## 📋 What Gets Created

The migration creates:

✅ **users** table with columns:
- `id` (UUID Primary Key)
- `username` (unique)
- `displayName`
- `tier` (free/premium/premium+/gold/verified)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

✅ **Index** on username for fast searches

✅ **Row Level Security (RLS)** policies for security

---

## ✅ Verify It Worked

Run this test to confirm tables exist:

```bash
# In Node.js or browser console with Supabase client initialized:
const { data, error } = await supabaseClient
  .from('users')
  .select('*')
  .limit(1);

console.log('Table exists:', !error);
```

---

## 🔧 Environment Variables Needed

Make sure your `.env` has these set:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Find these in your Supabase dashboard → Settings → API
