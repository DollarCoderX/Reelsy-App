import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Home, Search, MessageCircle, Flame, Settings } from "lucide-react";
import HomeTab from "./tabs/HomeTab";
import SearchTab from "./tabs/SearchTab";
import ChatTab from "./tabs/ChatTab";
import ActivityTab from "./tabs/ActivityTab";
import SettingsTab from "./tabs/SettingsTab";
import FeatureIntroSheet from "./FeatureIntroSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppContext } from "@/context/AppContext";
import { useFeatureIntro } from "@/context/FeatureIntroContext";
import { NotificationProvider, useNotifications } from "@/context/NotificationContext";
import { NotificationToast } from "./NotificationToast";
import reelsyLogo from "@assets/j.png";

const TABS_MAP = {
  home: { id: "home", icon: Home, label: "Home" },
  search: { id: "search", icon: Search, label: "Search" },
  chat: { id: "chat", icon: MessageCircle, label: "Chat" },
  activity: { id: "activity", icon: Flame, label: "Activity" },
  settings: { id: "settings", icon: Settings, label: "Settings" },
};

type UiState = { tab?: string; threadId?: string | null };

// Safe hook that returns zeros if NotificationContext not yet mounted
function useNotificationsIfAvailable() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useNotifications();
  } catch {
    return { unreadCount: 0, unreadMessageCount: 0 };
  }
}

const MainAppInner = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { featureIntro, handleFeatureIntroClose } = useFeatureIntro();

  // --- History API for mobile back button ---
  const historyKey = "reelsy_ui_state";
  const isHistorySyncRef = useRef(false);

  const applyUiState = (s: UiState) => {
    if (s.tab && s.tab !== activeTab) {
      isHistorySyncRef.current = true;
      setActiveTab(s.tab);
      isHistorySyncRef.current = false;
    }

    // Thread restoration is handled via localStorage + ChatTab
    if (s.threadId !== undefined) {
      if (s.tab !== "chat") return;
      localStorage.setItem(
        "reelsy_active_thread_id",
        s.threadId ? String(s.threadId) : ""
      );
      if (!s.threadId) localStorage.removeItem("reelsy_active_thread_id");
    }
  };

  useEffect(() => {
    // Initialize from current URL params.
    const url = new URL(window.location.href);
    const tab = (url.searchParams.get("tab") || undefined) as string | undefined;
    const threadId = url.searchParams.get("thread") || null;

    if (tab) setActiveTab(tab);
    if (threadId) localStorage.setItem("reelsy_active_thread_id", threadId);

    const readFromUrl = () => {
      const sp = new URL(window.location.href).searchParams;
      const nextTab = sp.get("tab") || "home";
      const nextThread = sp.get("thread");
      setActiveTab(nextTab);
      if (nextThread) localStorage.setItem("reelsy_active_thread_id", nextThread);
      else localStorage.removeItem("reelsy_active_thread_id");
    };

    const onPop = () => {
      // When back is pressed, just restore based on URL params/state.
      // This avoids partial updates that can leave the UI stuck.
      readFromUrl();
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // Push a history entry whenever the visible tab changes.
    if (isHistorySyncRef.current) return;

    const threadId = localStorage.getItem("reelsy_active_thread_id");

    const state: UiState = {
      tab: activeTab,
      threadId: threadId ? threadId : null,
    };

    // Avoid spamming history for initial mount.
    const currentState = window.history.state as UiState | null;
    const sameTab = currentState && currentState.tab === activeTab;
    const method = sameTab ? "replaceState" : "pushState";

    const url = new URL(window.location.href);
    if (activeTab && activeTab !== "home") url.searchParams.set("tab", activeTab);
    else url.searchParams.delete("tab");

    if (threadId && activeTab === "chat") url.searchParams.set("thread", threadId);
    else url.searchParams.delete("thread");

    (window.history as any)[method]({ ...state, __k: historyKey }, "", url);
  }, [activeTab]);

  const [hideNav, setHideNav] = useState(false);
  const isMobile = useIsMobile();
  const { user, tier, t } = useAppContext();

  // Navigator customization state
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("reelsy_tab_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ["home", "search", "chat", "activity", "settings"];
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (tier === "premium" || tier === "premium+" || tier === "gold") {
        setIsCustomizing(true);
        setToastMessage("Customize Navigator Enabled");
        setShowToast(true);
      } else {
        setToastMessage("Navigator customization is a Premium feature! ✨");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }, 800);
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDragEnd = () => {
    if (isCustomizing) {
      localStorage.setItem("reelsy_tab_order", JSON.stringify(tabOrder));
      setIsCustomizing(false);
      setShowToast(false);
    }
  };

  const onNavVisible = useCallback((visible: boolean) => {
    setHideNav(!visible);
  }, []);

  const { unreadCount, unreadMessageCount } = useNotificationsIfAvailable();

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab onNavVisible={onNavVisible} />;
      case "search":
        return (
          <SearchTab
            onOpenThread={(id: string) => {
              setActiveTab("chat");
              localStorage.setItem("reelsy_active_thread_id", id);

              // ensure back returns to thread list UI
              try {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "chat");
                url.searchParams.set("thread", id);
                window.history.pushState({ tab: "chat", threadId: id }, "", url);
              } catch {}
            }}
            onGoHome={() => setActiveTab("home")}
          />
        );
      case "chat":
        return <ChatTab onNavVisible={onNavVisible} />;
      case "activity":
        return <ActivityTab />;
      case "settings":
        return <SettingsTab onNavVisible={onNavVisible} />;
      default:
        return <HomeTab onNavVisible={onNavVisible} />;
    }
  };

  const getTabBadge = (tabId: string) => {
    if (tabId === "activity") return unreadCount;
    if (tabId === "chat") return unreadMessageCount;
    return 0;
  };

  const avatarUrl =
    user?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}&backgroundColor=b6e3f4`;

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-background text-foreground overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {!hideNav && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-5 pointer-events-none z-50"
            >
              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -12, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="bg-foreground text-background text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto border border-background/25 mb-2"
                  >
                    {toastMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                layout
                className="pointer-events-auto rounded-full px-2 py-2 flex items-center"
                style={{
                  background: "hsl(var(--background) / 0.84)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  boxShadow:
                    "0 2px 32px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.06) inset",
                }}
              >
                <Reorder.Group
                  axis="x"
                  values={tabOrder}
                  onReorder={setTabOrder}
                  className="flex items-center gap-0.5"
                >
                  {tabOrder.map((id) => {
                    const tab = TABS_MAP[id as keyof typeof TABS_MAP];
                    if (!tab) return null;
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <Reorder.Item
                        key={tab.id}
                        value={tab.id}
                        dragListener={isCustomizing}
                        onDragEnd={handleDragEnd}
                        className="relative outline-none select-none"
                      >
                        <motion.button
                          onClick={() => {
                            if (!isCustomizing) {
                              setActiveTab(tab.id);
                            }
                          }}
                          onMouseDown={startLongPress}
                          onMouseUp={endLongPress}
                          onTouchStart={startLongPress}
                          onTouchEnd={endLongPress}
                          className="relative w-12 h-11 flex flex-col items-center justify-center rounded-full select-none outline-none"
                          whileTap={{ scale: 0.88 }}
                          transition={{ type: "spring", stiffness: 600, damping: 28 }}
                          aria-label={t(tab.label)}
                        >
                          <div className="relative">
                            <Icon
                              className="transition-colors animate-none"
                              style={{
                                width: 22,
                                height: 22,
                                color: isActive
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--muted-foreground))",
                                fill: isActive ? "hsl(var(--foreground))" : "none",
                                strokeWidth: isActive ? 2 : 1.7,
                              }}
                            />
                            {getTabBadge(tab.id) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                                {getTabBadge(tab.id) > 9 ? "9+" : getTabBadge(tab.id)}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <motion.div
                              layoutId="navDot"
                              className="absolute -bottom-0.5 rounded-full bg-foreground"
                              style={{ width: 4, height: 4 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}
                        </motion.button>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <FeatureIntroSheet
          open={featureIntro != null}
          title={featureIntro?.title || ""}
          description={featureIntro?.description || ""}
          learnMoreText="Learn more"
          onClose={handleFeatureIntroClose}
          onOk={() => {
            if (!featureIntro) return;
            featureIntro.action();
            handleFeatureIntroClose();
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full bg-background text-foreground overflow-hidden"
    >
      <div className="w-[260px] shrink-0 border-r border-border flex flex-col py-6 px-4 gap-2 h-full">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <img
            src={reelsyLogo}
            alt="Reelsy"
            className="w-9 h-9 rounded-xl object-cover shadow"
          />
          <div>
            <p className="font-bold text-[16px] tracking-tight leading-none">Reelsy</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              by Uraincle
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {tabOrder.map((id) => {
            const tab = TABS_MAP[id as keyof typeof TABS_MAP];
            if (!tab) return null;
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon style={{ width: 18, height: 18, strokeWidth: isActive ? 2.2 : 1.8 }} />
                  {getTabBadge(tab.id) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                      {getTabBadge(tab.id) > 9 ? "9+" : getTabBadge(tab.id)}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-[13px]">{t(tab.label)}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4 mt-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary shrink-0">
              {user?.avatar ? (
                user.avatar.startsWith("<") ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: user.avatar }}
                    className="w-full h-full"
                  />
                ) : (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] truncate">{user?.nickname || "Your Name"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.username || "@username"}</p>
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                tier === "free"
                  ? "bg-secondary text-muted-foreground"
                  : tier === "premium"
                    ? "bg-amber-500/10 text-amber-600"
                    : tier === "premium+"
                      ? "bg-violet-500/10 text-violet-600"
                      : "bg-yellow-500/10 text-yellow-600"
              }`}
            >
              {tier === "free"
                ? "Free"
                : tier === "premium"
                  ? "Premium"
                  : tier === "premium+"
                    ? "Premium+"
                    : "Gold"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>

        <FeatureIntroSheet
          open={featureIntro != null}
          title={featureIntro?.title || ""}
          description={featureIntro?.description || ""}
          learnMoreText="Learn more"
          onClose={handleFeatureIntroClose}
          onOk={() => {
            if (!featureIntro) return;
            featureIntro.action();
            handleFeatureIntroClose();
          }}
        />
      </div>
    </motion.div>
  );
};

// Wrapper that provides NotificationContext to the inner app
const MainApp = () => {
  const { user } = useAppContext();
  const userId = user?.supabaseId || user?.username || undefined;
  const username = user?.username || undefined;

  return (
    <NotificationProvider userId={userId} username={username}>
      <MainAppInner />
      <NotificationToast />
    </NotificationProvider>
  );
};

export default MainApp;

