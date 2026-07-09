import { createClient } from '@supabase/supabase-js';
import { getUsersCollection } from './mongodb';

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

/**
 * Comprehensive check of user status in Supabase
 * Checks email, user data, ban status, metadata, and all user fields
 * Returns detailed status for real-time updates
 */
export async function checkSupabaseUserStatus(userId: string): Promise<{
  isDisabled: boolean;
  reason?: string;
  bannedUntil?: string;
  emailDisabled?: boolean;
  emailStatus?: string;
  email?: string;
  emailConfirmed?: boolean;
  appMetadata?: any;
  userMetadata?: any;
  lastSignInAt?: string;
  changes?: string[];
}> {
  try {
    const client = getSupabaseClient();
    
    // Access the admin API to check auth status comprehensively
    // Note: This requires SUPABASE_SERVICE_KEY with admin privileges
    const { data: user, error } = await client.auth.admin.getUserById(userId);

    if (error) {
      console.error('Failed to check user status:', error);
      return { isDisabled: false };
    }

    if (!user) {
      console.warn(`User ${userId} not found in Supabase auth.users`);
      return {
        isDisabled: true,
        reason: 'User account not found in Supabase',
        changes: ['user_deleted_or_not_found'],
      };
    }

    const changes: string[] = [];
    let isDisabled = false;
    let reason: string | undefined;

    // 1. Check if user is banned (Supabase sets banned_until timestamp)
    if (user.banned_until) {
      const banUntil = new Date(user.banned_until);
      if (banUntil > new Date()) {
        isDisabled = true;
        reason = `User account is banned until ${user.banned_until}`;
        changes.push('user_banned');
        console.log(`User ${userId} is banned until ${user.banned_until}`);
      }
    }

    // 2. Check if user is disabled via app_metadata.disabled
    if (user.app_metadata?.disabled === true) {
      isDisabled = true;
      reason = reason || 'User account is disabled by admin';
      changes.push('app_metadata_disabled');
      console.log(`User ${userId} has app_metadata.disabled = true`);
    }

    // 3. Check email confirmation status
    if (!user.email_confirmed_at) {
      // Email is not confirmed
      changes.push('email_not_confirmed');
      console.log(`User ${userId} email not confirmed`);
      
      // Only disable if they require confirmation and haven't confirmed
      if (!user.user_metadata?.skip_email_check && !isDisabled) {
        isDisabled = true;
        reason = reason || 'Email address not confirmed';
      }
    } else {
      changes.push('email_confirmed');
    }

    // 4. Check if email itself is deleted or invalid
    if (!user.email) {
      isDisabled = true;
      reason = reason || 'Email address removed or invalid';
      changes.push('email_missing');
      console.log(`User ${userId} has no email address`);
    }

    // 5. Check app_metadata for any ban or suspension flags
    if (user.app_metadata) {
      if (user.app_metadata.provider_name === 'email' && user.app_metadata.blocked === true) {
        isDisabled = true;
        reason = reason || 'Email provider blocked';
        changes.push('email_provider_blocked');
        console.log(`User ${userId} email provider is blocked`);
      }
      
      if (user.app_metadata.suspended === true) {
        isDisabled = true;
        reason = reason || 'Account suspended';
        changes.push('account_suspended');
        console.log(`User ${userId} account is suspended`);
      }
      
      if (user.app_metadata.banned === true) {
        isDisabled = true;
        reason = reason || 'Account banned by system';
        changes.push('account_banned');
        console.log(`User ${userId} account is banned`);
      }
    }

    // 6. Check if user_metadata has any blocking flags
    if (user.user_metadata) {
      if (user.user_metadata.blocked === true) {
        isDisabled = true;
        reason = reason || 'User blocked';
        changes.push('user_blocked');
        console.log(`User ${userId} is blocked (user_metadata.blocked)`);
      }
      
      if (user.user_metadata.banned === true) {
        isDisabled = true;
        reason = reason || 'User banned';
        changes.push('user_banned_metadata');
        console.log(`User ${userId} is banned (user_metadata.banned)`);
      }
      
      if (user.user_metadata.suspended === true) {
        isDisabled = true;
        reason = reason || 'User suspended';
        changes.push('user_suspended_metadata');
        console.log(`User ${userId} is suspended (user_metadata.suspended)`);
      }
    }

    // 7. Check last sign-in (detect inactive accounts)
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    if (lastSignIn) {
      changes.push(`last_sign_in: ${user.last_sign_in_at}`);
    }

    // Return comprehensive status
    const status = {
      isDisabled,
      reason: reason || (isDisabled ? 'Account disabled for unknown reason' : undefined),
      bannedUntil: user.banned_until,
      emailDisabled: !user.email_confirmed_at || !user.email,
      emailStatus: user.email_confirmed_at ? 'confirmed' : 'unconfirmed',
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      appMetadata: user.app_metadata,
      userMetadata: user.user_metadata,
      lastSignInAt: user.last_sign_in_at,
      changes: changes.length > 0 ? changes : undefined,
    };

    console.log(`Supabase user status for ${userId}:`, {
      isDisabled,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      changes: changes.length > 0 ? changes : 'no_changes',
    });

    return status;
  } catch (error) {
    console.error('Error checking Supabase user status:', error);
    return { isDisabled: false };
  }
}

/**
 * Ban a user via Supabase Admin API
 * Uses service_role to set ban duration and revoke all sessions
 * Also updates MongoDB with ban reason
 */
export async function banUserViaAdmin(
  supabaseUserId: string,
  mongoUsersCollection: any,
  banReason: string = 'Violation of Community Guidelines',
  banDurationHours: number = 87600 // ~10 years by default
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const client = getSupabaseClient();

    // 1. Ban the user in Supabase auth for specified duration
    console.log(`Banning user ${supabaseUserId} for ${banReason}`);
    const { error: banError } = await client.auth.admin.updateUserById(supabaseUserId, {
      ban_duration: `${banDurationHours}h`,
    });

    if (banError) {
      console.error('Failed to ban user in Supabase:', banError);
      return {
        success: false,
        message: 'Failed to ban user in Supabase',
        error: banError.message,
      };
    }

    // 2. Revoke all refresh tokens (force logout everywhere)
    console.log(`Revoking all sessions for user ${supabaseUserId}`);
    const { error: revokeError } = await client.auth.admin.deleteRefreshTokens(supabaseUserId);

    if (revokeError) {
      console.error('Failed to revoke sessions:', revokeError);
      // Continue anyway - ban is still in effect
    }

    // 3. Update MongoDB with ban info
    try {
      const usersCollection = mongoUsersCollection || (await getUsersCollection());
      const banUntilDate = new Date();
      banUntilDate.setHours(banUntilDate.getHours() + banDurationHours);

      const { value: updatedUser } = await usersCollection.findOneAndUpdate(
        { supabaseId: supabaseUserId },
        {
          $set: {
            isSuspended: true,
            isBanned: true,
            banReason: banReason,
            bannedAt: new Date(),
            bannedUntil: banUntilDate,
            suspensionReason: `Banned: ${banReason}`,
            suspensionDetails: `User banned until ${banUntilDate.toISOString()}`,
          },
        },
        { returnDocument: 'after' }
      );

      console.log(`User ${supabaseUserId} banned in both Supabase and MongoDB`);

      return {
        success: true,
        message: `User banned successfully until ${banUntilDate.toISOString()}`,
      };
    } catch (mongoError) {
      console.error('Failed to update MongoDB ban status:', mongoError);
      // Ban is in effect in Supabase even if MongoDB update fails
      return {
        success: true,
        message: 'User banned in Supabase (MongoDB update failed, but ban is in effect)',
      };
    }
  } catch (error) {
    console.error('Error banning user:', error);
    return {
      success: false,
      message: 'Error banning user',
      error: String(error),
    };
  }
}

/**
 * Unban a user via Supabase Admin API
 * Clears ban duration and updates MongoDB
 */
/**
 * Confirm a user's email in Supabase to prevent auto-ban for unconfirmed emails.
 * Called after Google OAuth signup since Google already verified the email.
 */
export async function confirmUserEmail(supabaseUserId: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.admin.updateUserById(supabaseUserId, {
      email_confirm: true,
    });
    if (error) {
      console.warn('Could not confirm user email in Supabase:', error.message);
      return false;
    }
    console.log(`Email confirmed for Supabase user ${supabaseUserId}`);
    return true;
  } catch (err) {
    console.warn('confirmUserEmail failed:', err);
    return false;
  }
}

export async function unbanUserViaAdmin(
  supabaseUserId: string,
  mongoUsersCollection: any
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const client = getSupabaseClient();

    // 1. Clear the ban in Supabase auth
    console.log(`Unbanning user ${supabaseUserId}`);
    const { error: unbanError } = await client.auth.admin.updateUserById(supabaseUserId, {
      ban_duration: null, // Clear ban
    });

    if (unbanError) {
      console.error('Failed to unban user in Supabase:', unbanError);
      return {
        success: false,
        message: 'Failed to unban user in Supabase',
        error: unbanError.message,
      };
    }

    // 2. Update MongoDB to clear ban
    try {
      const usersCollection = mongoUsersCollection || (await getUsersCollection());
      const { value: updatedUser } = await usersCollection.findOneAndUpdate(
        { supabaseId: supabaseUserId },
        {
          $set: {
            isBanned: false,
            banReason: null,
            bannedAt: null,
            bannedUntil: null,
          },
          $unset: {
            isSuspended: true,
            suspensionReason: '',
            suspensionDetails: '',
          },
        },
        { returnDocument: 'after' }
      );

      console.log(`User ${supabaseUserId} unbanned`);

      return {
        success: true,
        message: 'User unbanned successfully',
      };
    } catch (mongoError) {
      console.error('Failed to update MongoDB unban status:', mongoError);
      return {
        success: true,
        message: 'User unbanned in Supabase (MongoDB update failed)',
      };
    }
  } catch (error) {
    console.error('Error unbanning user:', error);
    return {
      success: false,
      message: 'Error unbanning user',
      error: String(error),
    };
  }
}
