import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Google OAuth sign in
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
      options: {
      // Important for Vercel/production: Supabase OAuth must redirect to your deployed domain.
      redirectTo:
        (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
        `${window.location.origin}`,
      scopes: 'profile email',
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

// Get current session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (session: any) => void) => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
    callback(session);
  });
  return authListener;
};
