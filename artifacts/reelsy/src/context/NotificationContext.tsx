import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { api, AppNotification } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  unreadMessageCount: number;
  setUnreadMessageCount: (n: number) => void;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addToast: (n: AppNotification) => void;
  toasts: AppNotification[];
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({
  children,
  userId,
  username,
}: {
  children: ReactNode;
  userId?: string;
  username?: string;
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const channelRef = useRef<any>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { notifications: notifs, unreadCount: count } =
        await api.engagement.getNotifications(userId, 40, username);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // Silently fail if API not running
    }
  }, [userId, username]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await api.engagement.markRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await api.engagement.markAllRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, [userId]);

  const addToast = useCallback((n: AppNotification) => {
    setToasts((prev) => [n, ...prev].slice(0, 5));
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t._id !== n._id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  }, []);

  // Subscribe to Supabase Realtime broadcast for instant friend-request toasts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`notifications:${userId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "notification" }, ({ payload }: any) => {
        if (payload && payload.userId === userId) {
          const newNotif = payload as AppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
          addToast(newNotif);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addToast]);

  // Initial fetch + poll every 30 s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadMessageCount,
        setUnreadMessageCount,
        fetchNotifications,
        markRead,
        markAllRead,
        addToast,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
};
