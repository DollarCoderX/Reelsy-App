import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

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
import MainApp from "@/components/MainApp";
import { ShieldAlert, Globe2 } from "lucide-react";

const queryClient = new QueryClient();

function AppContent() {
  const { appPhase } = useAppContext();
  const isMobile = useIsMobile();

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
          <IPBlocker>
            <AppContent />
          </IPBlocker>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
