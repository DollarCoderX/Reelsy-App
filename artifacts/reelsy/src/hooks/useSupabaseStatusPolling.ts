import { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { getSession } from '@/lib/supabase-client';

/**
 * Polls account status every 10 seconds.
 * Email-only users (no supabaseId) skip the Supabase session check entirely —
 * only the MongoDB profile endpoint is polled for ban/suspension status.
 */
export const useSupabaseStatusPolling = () => {
  const { user, setUser, setAppPhase } = useAppContext();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const restrictionStorageKey = 'reelsy_account_restriction';

  useEffect(() => {
    if (!user?.username) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const isGoogleUser = !!user.supabaseId;

    const checkStatus = async () => {
      try {
        const now = Date.now();
        if (now - lastCheckRef.current < 8000) return;
        lastCheckRef.current = now;

        // Only check Supabase session for Google OAuth users
        if (isGoogleUser) {
          try {
            const session = await getSession();

            if (!session) {
              // Lost session - but be lenient: only act if we confirm via backend
              console.warn('Supabase session not found for Google user');
            } else {
              const supabaseUser = session.user;

              if (supabaseUser.banned_until) {
                const banUntil = new Date(supabaseUser.banned_until);
                if (banUntil > new Date()) {
                  handleBan('Account banned', supabaseUser.banned_until);
                  return;
                }
              }

              if (supabaseUser.app_metadata?.disabled === true) {
                handleBan('Account disabled by admin');
                return;
              }

              // Backend check for Google users
              if (user.supabaseId) {
                try {
                  const response = await fetch(`/api/auth/check-supabase-status?supabaseId=${user.supabaseId}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.isDisabled) {
                      const phase = data.reason?.toLowerCase().includes('ban') ? 'banned' : 'account-suspended';
                      handleRestriction(data.reason || 'Account disabled', phase, data.bannedUntil);
                      return;
                    }
                  }
                } catch { /* non-fatal */ }
              }
            }
          } catch { /* Supabase session check failed, non-fatal */ }
        }

        // Poll MongoDB profile for ban/suspension for ALL users
        try {
          const profileResponse = await fetch(`/api/auth/profile/${user.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();

            if (profileData.isBanned && !user.isBanned) {
              handleBan(profileData.banReason || 'Account banned', profileData.bannedUntil);
              return;
            }

            if (profileData.isSuspended && !user.isSuspended) {
              handleRestriction(profileData.suspensionReason || 'Account suspended', 'account-suspended');
              return;
            }

            // Sync profile updates
            const hasChanges =
              profileData.displayName !== user.nickname ||
              profileData.profileImage !== user.avatar ||
              profileData.isBanned !== user.isBanned;

            if (hasChanges) {
              setUser({
                ...user,
                nickname: profileData.displayName || user.nickname,
                age: profileData.age || user.age,
                avatar: profileData.profileImage || user.avatar,
                isBanned: profileData.isBanned || false,
                banReason: profileData.banReason,
                bannedUntil: profileData.bannedUntil,
              });
            }
          }
        } catch { /* profile check failed, non-fatal */ }

      } catch (error) {
        console.error('Error in status polling:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkStatus();
    };

    checkStatus();
    pollingIntervalRef.current = setInterval(checkStatus, 10000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.username, user?.supabaseId]);

  const handleBan = (banReason: string, bannedUntil?: string) => {
    if (user) {
      const bannedUser = { ...user, isBanned: true, banReason, bannedUntil };
      setUser(bannedUser);
      sessionStorage.setItem(restrictionStorageKey, JSON.stringify({
        phase: 'banned', user: bannedUser, reason: banReason, updatedAt: new Date().toISOString(),
      }));
    }
    setAppPhase('banned');
  };

  const handleRestriction = (reason: string, phase: 'account-suspended' | 'banned', bannedUntil?: string) => {
    if (phase === 'banned') { handleBan(reason, bannedUntil); return; }
    if (user) {
      const suspendedUser = { ...user, isSuspended: true, suspensionReason: reason };
      setUser(suspendedUser);
      sessionStorage.setItem(restrictionStorageKey, JSON.stringify({
        phase, user: suspendedUser, reason, updatedAt: new Date().toISOString(),
      }));
    }
    setAppPhase('account-suspended');
  };
};

export default useSupabaseStatusPolling;
