/**
 * Typed API client — all backend calls in one place.
 * Uses relative URLs so it works across environments.
 */

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  let url = `${BASE}${path}`;
  if (options?.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const { query: _q, ...rest } = options || {};
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) },
    ...rest,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export const api = {
  posts: {
    getFeed: (params?: { limit?: number; skip?: number; username?: string }) =>
      request<{ posts: Post[] }>('/posts', { query: params as any }),

    create: (data: CreatePostData) =>
      request<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),

    delete: (id: string, username: string) =>
      request<{ message: string }>(`/posts/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ username }),
      }),

    getComments: (postId: string) =>
      request<{ comments: Comment[] }>(`/posts/${postId}/comments`),

    addComment: (postId: string, data: AddCommentData) =>
      request<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ─── Engagement ───────────────────────────────────────────────────────────
  engagement: {
    like: (postId: string, data: EngagementUser) =>
      request<{ likeCount: number }>(`/engagement/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    unlike: (postId: string, userId: string) =>
      request<{ likeCount: number }>(`/engagement/${postId}/like`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }),

    comment: (postId: string, data: EngagementUser & { text: string }) =>
      request<{ commentCount: number; commentId: string }>(`/engagement/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    reshare: (postId: string, data: EngagementUser) =>
      request<{ reshareCount: number }>(`/engagement/${postId}/reshare`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    save: (postId: string, data: EngagementUser) =>
      request<{ saved: boolean }>(`/engagement/${postId}/save`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getNotifications: (userId: string, limit = 30) =>
      request<{ notifications: AppNotification[]; unreadCount: number }>(
        '/engagement/user/notifications',
        { query: { userId, limit } }
      ),

    markRead: (notificationId: string) =>
      request<{ message: string }>(`/engagement/notifications/${notificationId}/read`, {
        method: 'PUT',
      }),

    markAllRead: (userId: string) =>
      request<{ updated: number }>('/engagement/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      }),
  },

  // ─── Users ────────────────────────────────────────────────────────────────
  users: {
    search: (q: string, limit = 20) =>
      request<{ users: UserProfile[] }>('/users/search', { query: { q, limit } }),

    getSuggestions: (username: string, limit = 10) =>
      request<{ users: UserProfile[] }>('/users/suggestions', { query: { username, limit } }),

    getFollowers: (username: string) =>
      request<{ count: number }>(`/users/${username}/followers`),

    follow: (followerUsername: string, followingUsername: string) =>
      request<{ following: boolean }>('/users/follow', {
        method: 'POST',
        body: JSON.stringify({ followerUsername, followingUsername }),
      }),
  },

  // ─── Friends ──────────────────────────────────────────────────────────────
  friends: {
    sendRequest: (data: SendFriendRequestData) =>
      request<{ requestId: string; message: string }>('/friends/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    accept: (requestId: string, userId: string) =>
      request<{ message: string }>(`/friends/request/${requestId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      }),

    decline: (requestId: string, userId: string) =>
      request<{ message: string }>(`/friends/request/${requestId}/decline`, {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      }),

    getIncoming: (userId: string) =>
      request<{ requests: FriendRequest[] }>('/friends/requests/incoming', { query: { userId } }),

    getOutgoing: (userId: string) =>
      request<{ requests: FriendRequest[] }>('/friends/requests/outgoing', { query: { userId } }),

    getStatus: (fromUserId: string, toUsername: string) =>
      request<FriendStatusResult>('/friends/status', { query: { fromUserId, toUsername } }),

    getFriends: (username: string) =>
      request<{ friends: UserProfile[]; count: number }>(`/friends/${username}`),

    unfriend: (username: string, friendUsername: string) =>
      request<{ message: string }>(`/friends/${friendUsername}`, {
        method: 'DELETE',
        query: { username },
      }),
  },

  // ─── Messages ─────────────────────────────────────────────────────────────
  messages: {
    getOrCreateConversation: (data: ConversationInitData) =>
      request<{ conversation: Conversation; existing: boolean }>('/messages/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getConversations: (userId: string) =>
      request<{ conversations: ConversationWithMeta[] }>('/messages/conversations', {
        query: { userId },
      }),

    send: (conversationId: string, data: SendMessageData) =>
      request<{ message: Message }>(`/messages/conversations/${conversationId}/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getMessages: (conversationId: string, limit = 40, before?: string) =>
      request<{ messages: Message[] }>(`/messages/conversations/${conversationId}/messages`, {
        query: { limit, before },
      }),

    markRead: (conversationId: string, userId: string) =>
      request<{ marked: number }>(`/messages/conversations/${conversationId}/read`, {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      }),
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Post {
  _id: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  userId?: string;
  content: string;
  type: 'text' | 'image' | 'video';
  media?: string | string[];
  likes: string[];
  reposts: string[];
  saves: string[];
  views: number;
  music?: { title: string; artist: string; url: string };
  location?: { name: string; lat?: number; lng?: number };
  createdAt: string;
  updatedAt: string;
  engagementCounts?: {
    likes: number;
    comments: number;
    reshares: number;
    saves: number;
  };
  replyCount?: number;
}

export interface Comment {
  _id: string;
  postId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  likes: string[];
  replyTo?: string;
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  bio?: string;
  tier?: string;
  supabaseId?: string;
  createdAt?: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromProfileImage?: string;
  type: 'like' | 'comment' | 'reshare' | 'save' | 'friend_request' | 'friend_accepted';
  postId?: string;
  requestId?: string;
  postPreview?: string;
  commentText?: string;
  read: boolean;
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatar?: string;
  toUserId: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type FriendStatus = 'none' | 'friends' | 'request_sent' | 'request_received' | 'not_found';
export interface FriendStatusResult {
  status: FriendStatus;
  requestId?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  last_message_preview?: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface ConversationWithMeta extends Conversation {
  otherUser?: ConversationParticipant;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'emoji' | 'image' | 'system';
  created_at: string;
  read_by: string[];
}

export interface EngagementUser {
  userId: string;
  username: string;
  displayName: string;
  profileImage?: string;
}

export interface CreatePostData {
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  type?: 'text' | 'image' | 'video';
  media?: string | string[];
  music?: { title: string; artist: string; url: string };
  location?: { name: string; lat?: number; lng?: number };
}

export interface AddCommentData {
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  replyTo?: string;
}

export interface SendFriendRequestData {
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatar?: string;
  toUsername: string;
}

export interface ConversationInitData {
  myUserId: string;
  myUsername: string;
  myDisplayName?: string;
  myAvatar?: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName?: string;
  otherAvatar?: string;
}

export interface SendMessageData {
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  content: string;
  messageType?: 'text' | 'emoji' | 'image' | 'system';
}
