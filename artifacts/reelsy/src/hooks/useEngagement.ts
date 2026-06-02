import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

interface UseEngagementProps {
  postId: string;
  initialCounts?: {
    likes: number;
    comments: number;
    reshares: number;
    saves: number;
  };
}

interface EngagementCounts {
  likes: number;
  comments: number;
  reshares: number;
  saves: number;
}

interface Comment {
  _id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  commentText: string;
  createdAt: string;
}

export const useEngagement = ({ postId, initialCounts }: UseEngagementProps) => {
  const { user } = useAppContext();
  const [counts, setCounts] = useState<EngagementCounts>(
    initialCounts || { likes: 0, comments: 0, reshares: 0, saves: 0 }
  );
  
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check initial like/save status
  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      try {
        const [likeRes, saveRes] = await Promise.all([
          fetch(`/api/engagement/${postId}/liked/${user.username}`),
          fetch(`/api/engagement/${postId}/saved/${user.username}`),
        ]);

        if (likeRes.ok) {
          const { liked } = await likeRes.json();
          setIsLiked(liked);
        }

        if (saveRes.ok) {
          const { saved } = await saveRes.json();
          setIsSaved(saved);
        }
      } catch (err) {
        console.error('Error checking engagement status:', err);
      }
    };

    checkStatus();
  }, [user, postId]);

  // Like post
  const like = useCallback(async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/engagement/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.username,
          username: user.username,
          displayName: user.nickname,
          profileImage: user.avatar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const { likeCount } = await response.json();
      setCounts(prev => ({ ...prev, likes: likeCount }));
      setIsLiked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error liking post');
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLoading]);

  // Unlike post
  const unlike = useCallback(async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/engagement/${postId}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.username }),
      });

      if (!response.ok) {
        throw new Error('Failed to unlike post');
      }

      const { likeCount } = await response.json();
      setCounts(prev => ({ ...prev, likes: likeCount }));
      setIsLiked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error unliking post');
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLoading]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (isLiked) {
      await unlike();
    } else {
      await like();
    }
  }, [isLiked, like, unlike]);

  // Add comment
  const comment = useCallback(async (text: string) => {
    if (!user || isLoading || !text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/engagement/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.username,
          username: user.username,
          displayName: user.nickname,
          text: text.trim(),
          profileImage: user.avatar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const { commentCount, commentId } = await response.json();
      setCounts(prev => ({ ...prev, comments: commentCount }));

      // Refresh comments
      await fetchComments();

      return { success: true, commentId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding comment';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLoading]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/engagement/${postId}/comments?limit=20`);

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const { comments: fetchedComments } = await response.json();
      setComments(fetchedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, [postId]);

  // Reshare post
  const reshare = useCallback(async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/engagement/${postId}/reshare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.username,
          username: user.username,
          displayName: user.nickname,
          profileImage: user.avatar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reshare post');
      }

      const { reshareCount } = await response.json();
      setCounts(prev => ({ ...prev, reshares: reshareCount }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resharing post');
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLoading]);

  // Save post
  const save = useCallback(async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/engagement/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.username,
          username: user.username,
          displayName: user.nickname,
          profileImage: user.avatar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }

      const { saved } = await response.json();
      setCounts(prev => ({ ...prev, saves: saved ? prev.saves + 1 : Math.max(0, prev.saves - 1) }));
      setIsSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving post');
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLoading]);

  return {
    counts,
    isLiked,
    isSaved,
    isLoading,
    comments,
    error,
    like,
    unlike,
    toggleLike,
    comment,
    fetchComments,
    reshare,
    save,
  };
};

// Hook for notifications
export const useNotifications = () => {
  const { user } = useAppContext();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/engagement/user/notifications?userId=${user.username}&limit=20`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const { notifications: fetchedNotifications, unreadCount: count } = await response.json();
      setNotifications(fetchedNotifications);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/engagement/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
  };
};
