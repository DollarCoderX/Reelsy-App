import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase, getSession } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const { setAppPhase, setUser, user } = useAppContext();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if user already logged in via context
        if (user) {
          setAppPhase('main');
          return;
        }

        // Get the session from Supabase
        const session = await getSession();

        if (!session) {
          setIsProcessing(false);
          return;
        }

        const { access_token } = session;
        const supabaseUser = session.user;

        // Send to backend to create/update user
        const response = await fetch('/api/auth/signin-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: access_token,
            displayName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            birthday: supabaseUser.user_metadata?.birthday || new Date().toISOString().split('T')[0],
            location: supabaseUser.user_metadata?.location || '',
            profileImage:
              supabaseUser.user_metadata?.avatar_url ||
              supabaseUser.user_metadata?.picture ||
              supabaseUser.user_metadata?.profile_image ||
              '',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Registration failed');
        }

        const result = await response.json();

        // Store JWT token and Supabase ID for later polling
        localStorage.setItem('authToken', result.token);
        if (result.user.supabaseId) {
          localStorage.setItem('supabaseId', result.user.supabaseId);
        }

        // Update app context with user data (including Supabase ID for polling)
        setUser({
          username: result.user.username,
          nickname: result.user.displayName,
          age: result.user.age || 0,
          email: result.user.email,
          avatar: result.user.profileImage || undefined,
          supabaseId: result.user.supabaseId,
          isSuspended: result.user.isSuspended || false,
          suspensionReason: result.user.suspensionReason,
          suspensionDetails: result.user.suspensionDetails,
          isBanned: result.user.isBanned || false,
          banReason: result.user.banReason,
        });

        // If suspended or banned, route to appropriate screen instead of main
        if (result.user.isSuspended) {
          setAppPhase('account-suspended');
          return;
        }
        if (result.user.isBanned) {
          setAppPhase('banned');
          return;
        }

        // Returning users go straight to main; new users see interests selection
        const isNewUser = result.message === 'User created successfully' || result.message?.includes('created');
        setAppPhase(isNewUser ? 'auth-interests' : 'main');
      } catch (err) {
        console.error('Auth callback error:', err);
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Authentication failed',
          variant: 'destructive',
        });
        setAppPhase('auth-email');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [setAppPhase, setUser, user, toast]);

  if (!isProcessing && user) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-4 animate-spin" />
        <p className="text-foreground/60">{isProcessing ? 'Completing sign in...' : 'Redirecting...'}</p>
      </div>
    </div>
  );
};

export default AuthCallback;


