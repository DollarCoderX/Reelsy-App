/**
 * useOnlinePresence — tracks which users are online via Supabase Realtime Presence.
 * Call once at the app level; returns a Set of online usernames.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export function useOnlinePresence(myUsername?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!myUsername) return;

    const channel = supabase.channel("reelsy:online", {
      config: { presence: { key: myUsername } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = new Set<string>();
        for (const key of Object.keys(state)) {
          users.add(key);
        }
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ key }: { key: string }) => {
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username: myUsername, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [myUsername]);

  const isOnline = (username: string) => onlineUsers.has(username);

  return { onlineUsers, isOnline };
}

export default useOnlinePresence;
