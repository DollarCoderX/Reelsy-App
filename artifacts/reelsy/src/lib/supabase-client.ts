import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Google OAuth sign in
export const signInWithGoogle = async () => {
  // Clear explicit logout flag so Supabase session check works after OAuth redirect
  localStorage.removeItem('reelsy_explicitly_logged_out');
  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  const redirectTo = siteUrl || window.location.origin;

  if (import.meta.env.PROD && !redirectTo) {
    throw new Error('VITE_SITE_URL is required in production for Supabase OAuth redirectTo');
  }

  if (import.meta.env.PROD && redirectTo.includes('localhost')) {
    console.warn('Supabase OAuth redirectTo is localhost in production. Check VITE_SITE_URL and deployment settings.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
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
