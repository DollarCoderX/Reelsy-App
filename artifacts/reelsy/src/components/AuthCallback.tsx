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
        const response = await fetch('/api/auth/register/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: access_token,
            displayName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            birthday: supabaseUser.user_metadata?.birthday || new Date().toISOString().split('T')[0],
            location: supabaseUser.user_metadata?.location || '',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Registration failed');
        }

        const result = await response.json();

        // Store JWT token
        localStorage.setItem('authToken', result.token);

        // Update app context with user data
        setUser({
          username: result.user.username,
          nickname: result.user.displayName,
          age: result.user.age,
          email: result.user.email,
        });

        // Move to main app
        setAppPhase('main');
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


