import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { FeatureIntroProvider } from "@/context/FeatureIntroContext";
import { AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSupabaseStatusPolling } from "@/hooks/useSupabaseStatusPolling";
import { useEffect } from "react";

import SplashScreen from "@/components/SplashScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import AuthToS from "@/components/AuthToS";
import AuthEmail from "@/components/AuthEmail";
import AuthOTP from "@/components/AuthOTP";
import AuthPassword from "@/components/AuthPassword";
import AuthProfile from "@/components/AuthProfile";
import AuthInterests from "@/components/AuthInterests";
import AuthFriendSuggestions from "@/components/AuthFriendSuggestions";
import AuthPermissions from "@/components/AuthPermissions";
import AccountSuspended from "@/components/AccountSuspended";
import BannedUser from "@/components/BannedUser";
import MainApp from "@/components/MainApp";
import { ShieldAlert, Globe2 } from "lucide-react";
import { getSession } from "@/lib/supabase-client";

const queryClient = new QueryClient();

function AppContent() {
  const { appPhase, setAppPhase, setUser, user } = useAppContext();
  const isMobile = useIsMobile();

  // Poll Supabase status every 10 seconds to detect bans/disabling
  useSupabaseStatusPolling();

  // Check for persisted user on mount
  useEffect(() => {
    const checkAuth = async () => {
      // If user already in context, check for ban/suspension
      if (user) {
        // Check if account is banned (highest priority)
        if (user.isBanned) {
          setAppPhase('banned');
        } else if (user.isSuspended) {
          setAppPhase('account-suspended');
        } else {
          setAppPhase('main');
        }
        return;
      }

      // Check for persisted user in localStorage (from previous OAuth)
      const storedUser = localStorage.getItem('reelsy_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.banned && !parsedUser.isBanned) {
            parsedUser.isBanned = true;
          }
          setUser(parsedUser);

          if (parsedUser.isBanned) {
            setAppPhase('banned');
          } else if (parsedUser.isSuspended) {
            setAppPhase('account-suspended');
          } else {
            setAppPhase('main');
          }
          return;
        } catch (e) {
          console.error('Failed to restore user:', e);
        }
      }

      // Try to get fresh Supabase session (user just completed OAuth redirect)
      try {
        const session = await getSession();
        if (!session) return; // No session, stay on auth screen

        const { access_token } = session;
        const supabaseUser = session.user;

        // Call backend to complete registration/login
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
          const errorData = await response.json();
          console.error('Backend error:', errorData);
          return;
        }

        const result = await response.json();
        localStorage.setItem('authToken', result.token);
        if (result.user.supabaseId) {
          localStorage.setItem('supabaseId', result.user.supabaseId);
        }
        
        const newUser = {
          username: result.user.username,
          nickname: result.user.displayName,
          age: result.user.age,
          email: result.user.email,
          avatar: result.user.profileImage || undefined,
          supabaseId: result.user.supabaseId,
          isBanned: result.user.isBanned,
          banReason: result.user.banReason,
          bannedAt: result.user.bannedAt,
          bannedUntil: result.user.bannedUntil,
          isSuspended: result.user.isSuspended,
          suspensionReason: result.user.suspensionReason,
          suspensionDetails: result.user.suspensionDetails,
        };
        
        setUser(newUser);
        
        // Check if account is banned (highest priority)
        if (result.user.isBanned) {
          setAppPhase('banned');
        } else if (result.user.isSuspended) {
          setAppPhase('account-suspended');
        } else {
          // Route to interests selection after Google OAuth
          setAppPhase('auth-interests');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
      }
    };

    checkAuth();
  }, []); // Empty deps - run once on mount

  const isAuthFlow = appPhase !== "main";

  const authScreens = (
    <AnimatePresence mode="wait">
      {appPhase === "splash" && <SplashScreen key="splash" />}
      {appPhase === "welcome" && <WelcomeScreen key="welcome" />}
      {appPhase === "auth-tos" && <AuthToS key="auth-tos" />}
      {appPhase === "auth-email" && <AuthEmail key="auth-email" />}
      {appPhase === "auth-otp" && <AuthOTP key="auth-otp" />}
      {appPhase === "auth-password" && <AuthPassword key="auth-password" />}
      {appPhase === "auth-profile" && <AuthProfile key="auth-profile" />}
      {appPhase === "auth-interests" && <AuthInterests key="auth-interests" />}
      {appPhase === "auth-friends" && <AuthFriendSuggestions key="auth-friends" />}
      {appPhase === "auth-permissions" && <AuthPermissions key="auth-permissions" />}
      {appPhase === "account-suspended" && <AccountSuspended key="account-suspended" username={user?.username || ''} email={user?.email || ''} />}
      {appPhase === "banned" && <BannedUser key="banned" />}
    </AnimatePresence>
  );

  if (isMobile || isAuthFlow) {
    return (
      <div className="w-full h-[100dvh] bg-background flex items-center justify-center overflow-hidden">
        <div className="w-full h-full bg-background relative overflow-hidden flex flex-col">
          {isAuthFlow ? authScreens : <MainApp key="main" />}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-background overflow-hidden relative">
      <MainApp key="main" />
    </div>
  );
}

function IPBlocker({ children }: { children: React.ReactNode }) {
  const { ip } = useAppContext();
  const { blocked, reason } = ip;

  if (blocked) {
    return (
      <div className="w-full h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center z-[100] absolute inset-0">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
          {reason === "vpn" ? (
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          ) : (
            <Globe2 className="w-8 h-8 text-rose-500" />
          )}
        </div>
        <h1 className="text-[20px] font-bold text-foreground mb-2">
          {reason === "vpn" ? "VPN Detected" : "Region Unavailable"}
        </h1>
        <p className="text-[14px] text-muted-foreground max-w-[280px]">
          {reason === "vpn"
            ? "Turn off VPN. Reelsy doesn't allow VPN usage to ensure safety and authenticity."
            : "This app isn't available in your country yet."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <FeatureIntroProvider>
            <IPBlocker>
              <AppContent />
            </IPBlocker>
          </FeatureIntroProvider>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
