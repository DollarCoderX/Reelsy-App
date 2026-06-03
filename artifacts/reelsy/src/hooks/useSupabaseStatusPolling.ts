import { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { getSession } from '@/lib/supabase-client';

/**
 * Hook to poll Supabase session status every 10 seconds
 * Also checks MongoDB for profile updates
 * Detects if account is disabled/banned and logs out user immediately
 */
export const useSupabaseStatusPolling = () => {
  const { user, setUser, setAppPhase } = useAppContext();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.username || !user?.supabaseId) {
      // Stop polling if no user logged in
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const checkSupabaseStatus = async () => {
      try {
        // Throttle checks to avoid excessive processing
        const now = Date.now();
        if (now - lastCheckRef.current < 5000) {
          return; // Skip if checked in last 5 seconds
        }
        lastCheckRef.current = now;

        // Get fresh session from Supabase
        const session = await getSession();

        if (!session) {
          // No session - user was logged out
          console.warn('Supabase session lost, logging out');
          handleLogout('Your session has expired.');
          return;
        }

        const supabaseUser = session.user;

        // Check if account is disabled (banned on Supabase)
        // Supabase sets banned_until to a future date when account is disabled
        if (supabaseUser.banned_until) {
          const banUntil = new Date(supabaseUser.banned_until);
          if (banUntil > new Date()) {
            console.warn('Account is disabled on Supabase because it is banned, logging out');
            handleLogout('Your account has been disabled.', 'banned');
            return;
          }
        }

        // Check if user email is confirmed (some disabling methods unconfirm email)
        if (supabaseUser.email_confirmed_at === null && !supabaseUser.user_metadata?.skip_email_check) {
          console.warn('Account email not confirmed, logging out');
          handleLogout('Your account email is no longer confirmed.');
          return;
        }

        // Check if user role/metadata indicates ban
        if (supabaseUser.app_metadata?.disabled === true) {
          console.warn('Account disabled via app_metadata, logging out');
          handleLogout('Your account has been disabled by admin.');
          return;
        }

        // Also validate via backend endpoint for comprehensive verification
        // The backend checks: email status, ban status, metadata, all user fields
        if (user.supabaseId) {
          try {
            const response = await fetch(`/api/auth/check-supabase-status?supabaseId=${user.supabaseId}`);
            if (response.ok) {
              const data = await response.json();
              
              // Log all changes detected in Supabase
              if (data.changes && data.changes.length > 0) {
                console.log('🔍 Supabase user data changes detected:', data.changes);
              }
              
              // Check if account is disabled for ANY reason
              if (data.isDisabled) {
                console.warn('❌ Account is disabled - reason:', data.reason);
                console.warn('📊 Detailed status:', {
                  email: data.email,
                  emailConfirmed: data.emailConfirmed,
                  bannedUntil: data.bannedUntil,
                  appMetadata: data.appMetadata,
                  userMetadata: data.userMetadata,
                  changes: data.changes,
                });
                const banPhase =
                  data.changes?.includes('account_banned') ||
                  data.changes?.includes('user_banned') ||
                  data.reason?.toLowerCase().includes('ban')
                    ? 'banned'
                    : 'account-suspended';
                handleLogout(data.reason || 'Your account has been disabled.', banPhase);
                return;
              }
              
              // Check if email was disabled/removed
              if (data.emailDisabled && !user.isSuspended) {
                console.warn('⚠️ Account email has been disabled or removed');
                handleLogout('Your account email has been removed or disabled.');
                return;
              }
              
              // Check if any critical metadata changes
              if (data.changes) {
                const criticalChanges = data.changes.filter((c: string) =>
                  ['user_deleted_or_not_found', 'account_banned', 'account_suspended', 
                   'email_provider_blocked', 'user_blocked', 'email_missing'].includes(c)
                );
                
                if (criticalChanges.length > 0) {
                  console.warn('⚠️ Critical changes detected:', criticalChanges);
                  handleLogout('Your account has been modified. Please log in again.');
                  return;
                }
              }
            } else if (response.status === 401 || response.status === 403) {
              console.warn('❌ Unauthorized - logging out');
              handleLogout('Authentication failed. Please log in again.');
              return;
            }
          } catch (backendError) {
            console.warn('Backend validation check failed (non-fatal):', backendError);
            // Don't log out on backend errors - just continue
          }
        }

        // Check for profile updates from MongoDB every 10 seconds
        try {
          const profileResponse = await fetch(`/api/auth/profile/${user.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            
            // CHECK FOR BAN STATUS - HIGHEST PRIORITY
            if (profileData.isBanned && !user.isBanned) {
              console.warn('❌ User has been banned:', profileData.banReason);
              handleBan(profileData.banReason || 'Account suspended', profileData.bannedUntil);
              return;
            }
            
            // Update local user data if profile changed on server
            if (profileData.displayName !== user.nickname ||
                profileData.age !== user.age ||
                profileData.interests !== user.interests ||
                profileData.profileImage !== user.avatar) {
              console.log('Profile updated from server');
              setUser({
                ...user,
                nickname: profileData.displayName || user.nickname,
                age: profileData.age || user.age,
                interests: profileData.interests || user.interests,
                avatar: profileData.profileImage || user.avatar,
                isBanned: profileData.isBanned || false,
                banReason: profileData.banReason,
              });
            }
          }
        } catch (profileError) {
          console.warn('Profile check failed (non-fatal):', profileError);
        }

      } catch (error) {
        console.error('Error checking Supabase status:', error);
        // Don't log out on errors - just skip this check
      }
    };

    // Initial check immediately
    checkSupabaseStatus();

    // Then poll every 10 seconds
    pollingIntervalRef.current = setInterval(checkSupabaseStatus, 10000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user?.username, user?.supabaseId, setUser, setAppPhase]);

  const handleLogout = (
    reason: string = 'Your account has been disabled.',
    phase: 'account-suspended' | 'banned' = reason.toLowerCase().includes('ban') ? 'banned' : 'account-suspended'
  ) => {
    // Clear stored user data
    localStorage.removeItem('reelsy_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseId');

    // Reset user state
    setUser(null);

    // Update app phase with appropriate status
    setAppPhase(phase);

    // Show notification (optional - could use toast)
    console.log('User logged out:', reason, `(${phase})`);
  };

  const handleBan = (banReason: string = 'Account banned', bannedUntil?: string) => {
    // Update user state with ban info
    if (user) {
      setUser({
        ...user,
        isBanned: true,
        banReason: banReason,
        bannedUntil: bannedUntil,
      });
    }
    // Route to banned page
    setAppPhase('banned');
    console.warn('User account is banned:', banReason);
  };
};

export default useSupabaseStatusPolling;
