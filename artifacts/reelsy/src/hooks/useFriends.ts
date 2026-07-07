import { useState, useCallback } from "react";
import { api, FriendStatus, FriendRequest } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";

export interface FriendState {
  status: FriendStatus;
  requestId?: string;
}

/**
 * useFriends — manage friend relationships for the logged-in user.
 * Provides per-username status cache + actions.
 */
export function useFriends() {
  const { user } = useAppContext();
  const [statusCache, setStatusCache] = useState<Record<string, FriendState>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const myUserId =
    user?.supabaseId || user?.username || "";
  const myUsername = user?.username || "";
  const myDisplayName = user?.nickname || user?.username || "";
  const myAvatar = user?.avatar;

  const getStatus = useCallback(
    async (toUsername: string): Promise<FriendState> => {
      if (statusCache[toUsername]) return statusCache[toUsername];
      if (!myUserId) return { status: "none" };
      try {
        const res = await api.friends.getStatus(myUserId, toUsername);
        const state: FriendState = { status: res.status, requestId: res.requestId };
        setStatusCache((prev) => ({ ...prev, [toUsername]: state }));
        return state;
      } catch {
        return { status: "none" };
      }
    },
    [myUserId, statusCache]
  );

  const sendRequest = useCallback(
    async (toUsername: string) => {
      if (!myUserId || !myUsername) return;
      setLoading((prev) => ({ ...prev, [toUsername]: true }));
      try {
        const res = await api.friends.sendRequest({
          fromUserId: myUserId,
          fromUsername: myUsername,
          fromDisplayName: myDisplayName,
          fromAvatar: myAvatar,
          toUsername,
        });
        setStatusCache((prev) => ({
          ...prev,
          [toUsername]: { status: "request_sent", requestId: res.requestId },
        }));
      } catch (err) {
        console.error("Failed to send friend request:", err);
      } finally {
        setLoading((prev) => ({ ...prev, [toUsername]: false }));
      }
    },
    [myUserId, myUsername, myDisplayName, myAvatar]
  );

  const acceptRequest = useCallback(
    async (requestId: string, fromUsername: string) => {
      if (!myUserId) return;
      setLoading((prev) => ({ ...prev, [fromUsername]: true }));
      try {
        await api.friends.accept(requestId, myUserId);
        setStatusCache((prev) => ({
          ...prev,
          [fromUsername]: { status: "friends" },
        }));
      } catch (err) {
        console.error("Failed to accept friend request:", err);
      } finally {
        setLoading((prev) => ({ ...prev, [fromUsername]: false }));
      }
    },
    [myUserId]
  );

  const declineRequest = useCallback(
    async (requestId: string, fromUsername: string) => {
      if (!myUserId) return;
      setLoading((prev) => ({ ...prev, [fromUsername]: true }));
      try {
        await api.friends.decline(requestId, myUserId);
        setStatusCache((prev) => ({
          ...prev,
          [fromUsername]: { status: "none" },
        }));
      } catch (err) {
        console.error("Failed to decline friend request:", err);
      } finally {
        setLoading((prev) => ({ ...prev, [fromUsername]: false }));
      }
    },
    [myUserId]
  );

  const cancelRequest = useCallback(
    async (requestId: string, toUsername: string) => {
      if (!myUserId) return;
      setLoading((prev) => ({ ...prev, [toUsername]: true }));
      try {
        await api.friends.decline(requestId, myUserId);
        setStatusCache((prev) => ({
          ...prev,
          [toUsername]: { status: "none" },
        }));
      } catch (err) {
        console.error("Failed to cancel friend request:", err);
      } finally {
        setLoading((prev) => ({ ...prev, [toUsername]: false }));
      }
    },
    [myUserId]
  );

  const unfriend = useCallback(
    async (friendUsername: string) => {
      if (!myUsername) return;
      setLoading((prev) => ({ ...prev, [friendUsername]: true }));
      try {
        await api.friends.unfriend(myUsername, friendUsername);
        setStatusCache((prev) => ({
          ...prev,
          [friendUsername]: { status: "none" },
        }));
      } catch (err) {
        console.error("Failed to unfriend:", err);
      } finally {
        setLoading((prev) => ({ ...prev, [friendUsername]: false }));
      }
    },
    [myUsername]
  );

  const getIncoming = useCallback(
    async (): Promise<FriendRequest[]> => {
      if (!myUserId) return [];
      try {
        const { requests } = await api.friends.getIncoming(myUserId);
        return requests;
      } catch {
        return [];
      }
    },
    [myUserId]
  );

  return {
    statusCache,
    loading,
    getStatus,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    getIncoming,
  };
}
