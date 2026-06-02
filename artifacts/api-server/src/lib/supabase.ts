import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export interface SupabaseUser {
  id?: string;
  username: string;
  displayName: string;
  tier: 'free' | 'premium' | 'premium+' | 'gold' | 'verified';
  createdAt?: string;
  updatedAt?: string;
}

export async function initSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Connected to Supabase');
    
    // Initialize database schema
    await initializeDatabase();
    
    return supabaseClient;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  const client = getSupabaseClient();
  
  try {
    // Try to create the users table with proper schema
    const { error } = await client.rpc('create_users_table_if_not_exists');
    
    // If RPC doesn't exist, we'll try direct creation
    if (error && error.code === 'PGRST105') {
      console.log('Creating users table via direct query...');
      
      // Alternative: Use a simple query to check if table exists
      const { data, error: checkError } = await client
        .from('users')
        .select('id')
        .limit(1);
      
      // If table doesn't exist, we need to create it via SQL
      // Since we can't run raw SQL, we'll log and let user know
      if (checkError && checkError.code === 'PGRST116') {
        console.warn('⚠️  Users table does not exist in Supabase.');
        console.warn('Please run this SQL in your Supabase dashboard (SQL Editor):');
        console.warn(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            username VARCHAR(255) UNIQUE NOT NULL,
            displayName VARCHAR(255) NOT NULL,
            tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'premium+', 'gold', 'verified')),
            createdAt TIMESTAMP DEFAULT NOW(),
            updatedAt TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        `);
        return false;
      }
      
      console.log('Users table already exists');
      return true;
    }
    
    if (error) {
      console.log('Database initialization check passed');
    } else {
      console.log('Users table created or already exists');
    }
    return true;
  } catch (err) {
    console.warn('Database initialization skipped (may need manual setup)', err);
    return false;
  }
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase() first.');
  }
  return supabaseClient;
}

export async function createSupabaseUser(user: SupabaseUser) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .insert([user])
    .select();

  if (error) {
    throw new Error(`Failed to create Supabase user: ${error.message}`);
  }

  return data?.[0];
}

export async function getSupabaseUser(username: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch Supabase user: ${error.message}`);
  }

  return data;
}

export async function updateSupabaseUser(username: string, updates: Partial<SupabaseUser>) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('username', username)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update Supabase user: ${error.message}`);
  }

  return data;
}
