/**
 * One-time seeder: creates the Whales Help Center bot account in Supabase + MongoDB.
 * Safe to call on every startup — idempotent.
 */
import { getUsersCollection } from './mongodb';
import { getSupabaseClient } from './supabase';
import { hashPassword } from './auth-utils';

export async function seedHelpCenterBot(): Promise<void> {
  try {
    const usersCollection = await getUsersCollection();
    const existing = await usersCollection.findOne({ username: 'whales' });
    if (existing) return; // already seeded

    // Create Supabase auth user
    let supabaseId: string | null = null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await (client.auth as any).admin.createUser({
        email: 'whales@whales.com',
        password: 'whales2025$',
        email_confirm: true,
        user_metadata: { username: 'whales', displayName: 'Help Center' },
      });
      if (error && !error.message?.includes('already registered')) {
        console.warn('Whales Supabase user creation warning:', error.message);
      }
      supabaseId = data?.user?.id || null;
    } catch (e: any) {
      console.warn('Whales Supabase creation skipped:', e.message);
    }

    const hashed = hashPassword('whales2025$');

    await usersCollection.insertOne({
      username: 'whales',
      displayName: 'Help Center',
      userEmail: 'whales@whales.com',
      emailPassword: hashed,
      supabaseId: supabaseId || `whales-bot-${Date.now()}`,
      profileImage: null,
      bio: '🐋 Reelsy Help Center — powered by AI. Ask me anything about Reelsy!',
      isBot: true,
      isHelpCenter: true,
      tier: 'verified',
      friendPolicy: 'open',
      messagingPolicy: 'everyone',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Whales Help Center bot seeded in MongoDB' + (supabaseId ? ' + Supabase' : ''));
  } catch (err: any) {
    console.warn('seedHelpCenterBot non-fatal error:', err.message);
  }
}
