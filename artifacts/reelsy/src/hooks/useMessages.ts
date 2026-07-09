import { useState, useEffect, useCallback, useRef } from "react";
import { api, Message, ConversationWithMeta } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";
import { useAppContext } from "@/context/AppContext";

/**
 * useConversations — list all DM threads for the current user
 * with Supabase Realtime subscription for new messages.
 */
export function useConversations() {
  const { user } = useAppContext();
  const userId = user?.supabaseId || user?.username || "";
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { conversations: convs } = await api.messages.getConversations(userId);
      setConversations(convs);
    } catch {
      /* API may not be running yet */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to all message inserts that involve the current user's conversations
  useEffect(() => {
    if (!userId || conversations.length === 0) return;

    const channel = supabase
      .channel(`user-messages:${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const msg: Message = payload.new;
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== msg.conversation_id) return conv;
              const isFromMe = msg.sender_id === userId;
              return {
                ...conv,
                last_message_preview: msg.content.slice(0, 80),
                last_message_at: msg.created_at,
                unreadCount: isFromMe ? conv.unreadCount : conv.unreadCount + 1,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversations.length]);

  return { conversations, loading, fetchConversations };
}

/**
 * useMessages — messages for a single conversation with Supabase Realtime.
 * Also supports typing indicator via Supabase Realtime Broadcast.
 */
export function useMessages(conversationId: string | null) {
  const { user } = useAppContext();
  const userId = user?.supabaseId || user?.username || "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const { messages: fetched } = await api.messages.getMessages(
          conversationId,
          40,
          before
        );
        if (before) {
          setMessages((prev) => [...fetched, ...prev]);
        } else {
          setMessages(fetched);
        }
        if (fetched.length < 40) setHasMore(false);
      } catch {
        /* API may not be running yet */
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Initial load + mark read
  useEffect(() => {
    if (!conversationId || !userId) return;
    setMessages([]);
    setHasMore(true);
    fetchMessages();
    api.messages.markRead(conversationId, userId).catch(() => {});
  }, [conversationId, userId, fetchMessages]);

  // Supabase Realtime subscription — messages + typing broadcast
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newMsg: Message = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark read immediately if I'm in the conversation
          if (newMsg.sender_id !== userId) {
            api.messages.markRead(conversationId, userId).catch(() => {});
          }
        }
      )
      // Typing indicator via broadcast (no DB writes, fully ephemeral)
      .on("broadcast" as any, { event: "typing" }, (payload: any) => {
        const typingUserId = payload?.payload?.userId;
        if (typingUserId && typingUserId !== userId) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, userId]);

  const sendMessage = useCallback(
    async (content: string, messageType: Message["message_type"] = "text") => {
      if (!conversationId || !userId || !user) return;
      try {
        const { message } = await api.messages.send(conversationId, {
          senderId: userId,
          senderUsername: user.username,
          senderAvatar: user.avatar,
          content,
          messageType,
        });
        // Optimistically add — Realtime will also fire but we dedupe
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      } catch (err) {
        console.error("Failed to send message:", err);
        throw err;
      }
    },
    [conversationId, userId, user]
  );

  /** Broadcast a typing event to the other participant (no DB write). */
  const sendTyping = useCallback(() => {
    if (!conversationId || !userId || !channelRef.current) return;
    channelRef.current
      .send({
        type: "broadcast",
        event: "typing",
        payload: { userId, username: user?.username },
      })
      .catch(() => {});
  }, [conversationId, userId, user?.username]);

  const loadMore = useCallback(() => {
    if (!messages.length || !hasMore || loading) return;
    fetchMessages(messages[0].created_at);
  }, [messages, hasMore, loading, fetchMessages]);

  return { messages, loading, hasMore, sendMessage, loadMore, isOtherTyping, sendTyping };
}
