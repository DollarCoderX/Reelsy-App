import { Router, Request, Response } from 'express';
import {
  likePost,
  unlikePost,
  addComment,
  resharePost,
  savePost,
  getUserNotifications,
  markNotificationRead,
  getPostComments,
  userLikedPost,
  userSavedPost,
  notifyProfileView,
} from '../lib/engagement';

const router = Router();

// Like a post
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, displayName, profileImage } = req.body;

    if (!userId || !username || !displayName) {
      return res.status(400).json({ error: 'userId, username, and displayName are required' });
    }

    const result = await likePost(postId, userId, username, displayName, profileImage);

    if (!result.success) {
      return res.status(400).json({ error: 'Could not like post (already liked or post not found)' });
    }

    return res.status(200).json({ message: 'Post liked', likeCount: result.likeCount });
  } catch (error) {
    req.log.error(error, 'Error liking post');
    return res.status(500).json({ error: 'Failed to like post' });
  }
});

// Unlike a post
router.delete('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await unlikePost(postId, userId);

    if (!result.success) {
      return res.status(400).json({ error: 'Could not unlike post' });
    }

    return res.status(200).json({ message: 'Post unliked', likeCount: result.likeCount });
  } catch (error) {
    req.log.error(error, 'Error unliking post');
    return res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// Comment on a post
router.post('/:postId/comment', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, displayName, text, profileImage } = req.body;

    if (!userId || !username || !displayName || !text) {
      return res.status(400).json({ error: 'userId, username, displayName, and text are required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Comment must be 1000 characters or less' });
    }

    const result = await addComment(postId, userId, username, displayName, text, profileImage);

    if (!result.success) {
      return res.status(400).json({ error: 'Could not add comment' });
    }

    return res.status(201).json({ 
      message: 'Comment added', 
      commentCount: result.commentCount,
      commentId: result.commentId,
    });
  } catch (error) {
    req.log.error(error, 'Error adding comment');
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get post comments
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const comments = await getPostComments(postId, limit);

    return res.status(200).json({ comments });
  } catch (error) {
    req.log.error(error, 'Error fetching comments');
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Reshare a post
router.post('/:postId/reshare', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, displayName, profileImage } = req.body;

    if (!userId || !username || !displayName) {
      return res.status(400).json({ error: 'userId, username, and displayName are required' });
    }

    const result = await resharePost(postId, userId, username, displayName, profileImage);

    if (!result.success) {
      return res.status(400).json({ error: 'Could not reshare post (already reshared or post not found)' });
    }

    return res.status(200).json({ message: 'Post reshared', reshareCount: result.reshareCount });
  } catch (error) {
    req.log.error(error, 'Error resharing post');
    return res.status(500).json({ error: 'Failed to reshare post' });
  }
});

// Save/Unsave a post
router.post('/:postId/save', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, displayName, profileImage } = req.body;

    if (!userId || !username || !displayName) {
      return res.status(400).json({ error: 'userId, username, and displayName are required' });
    }

    const result = await savePost(postId, userId, username, displayName, profileImage);

    if (!result.success) {
      return res.status(400).json({ error: 'Could not save post' });
    }

    return res.status(200).json({ 
      message: result.saved ? 'Post saved' : 'Post unsaved', 
      saved: result.saved,
    });
  } catch (error) {
    req.log.error(error, 'Error saving post');
    return res.status(500).json({ error: 'Failed to save post' });
  }
});

// Get user notifications
router.get('/user/notifications', async (req, res) => {
  try {
    const { userId, username } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const usernameStr = typeof username === 'string' ? username : undefined;

    const notifications = await getUserNotifications(userId, limit, usernameStr);

    return res.status(200).json({ 
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    });
  } catch (error) {
    req.log.error(error, 'Error fetching notifications');
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Profile view notification
router.post('/profile-view', async (req, res) => {
  try {
    const { viewerUserId, viewerUsername, viewerDisplayName, viewerProfileImage, profileOwnerId, profileOwnerUsername } = req.body;
    if (!viewerUserId || !viewerUsername || !profileOwnerId || !profileOwnerUsername) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await notifyProfileView(viewerUserId, viewerUsername, viewerDisplayName || viewerUsername, viewerProfileImage, profileOwnerId, profileOwnerUsername);
    return res.status(200).json({ ok: true });
  } catch (error) {
    // Non-fatal
    return res.status(200).json({ ok: false });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const success = await markNotificationRead(notificationId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    req.log.error(error, 'Error marking notification as read');
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications read for a user
router.put('/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { getNotificationsCollection } = await import('../lib/engagement');
    const col = await getNotificationsCollection();
    const result = await col.updateMany({ userId, read: false }, { $set: { read: true } });
    return res.json({ updated: result.modifiedCount });
  } catch (error) {
    req.log.error(error, 'Error marking all notifications read');
    return res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
});

// Check if user liked post
router.get('/:postId/liked/:userId', async (req, res) => {
  try {
    const { postId, userId } = req.params;

    const liked = await userLikedPost(postId, userId);

    return res.status(200).json({ liked });
  } catch (error) {
    req.log.error(error, 'Error checking if post is liked');
    return res.status(500).json({ error: 'Failed to check like status' });
  }
});

// Check if user saved post
router.get('/:postId/saved/:userId', async (req, res) => {
  try {
    const { postId, userId } = req.params;

    const saved = await userSavedPost(postId, userId);

    return res.status(200).json({ saved });
  } catch (error) {
    req.log.error(error, 'Error checking if post is saved');
    return res.status(500).json({ error: 'Failed to check save status' });
  }
});

// POST /engagement/:postId/report — report a post; suspends author after 5 unique reports
router.post('/:postId/report', async (req, res) => {
  try {
    const { postId } = req.params;
    const { reporterUsername, reporterUserId, reason } = req.body;

    if (!reporterUsername || !reason) {
      return res.status(400).json({ error: 'reporterUsername and reason are required' });
    }

    const { getMongoDBCollection, getUsersCollection } = await import('../lib/mongodb');
    const postsCollection = await getMongoDBCollection('posts');
    const reportsCollection = await getMongoDBCollection('post_reports');

    let postAuthorUsername: string | undefined;

    // Only track valid MongoDB post IDs (not ad-*, user-* fake IDs)
    const isValidObjectId = /^[a-f\d]{24}$/i.test(postId);
    if (isValidObjectId) {
      const { ObjectId } = await import('mongodb');
      const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
      postAuthorUsername = (post as any)?.authorUsername;

      // Dedupe: one report per reporter per post
      const alreadyReported = await reportsCollection.findOne({ postId, reporterUsername });
      if (!alreadyReported) {
        await reportsCollection.insertOne({ postId, reporterUsername, reporterUserId, reason, createdAt: new Date() });

        // Count total unique reporters for this post's author
        if (postAuthorUsername) {
          const usersCollection = await getUsersCollection();
          const user = await usersCollection.findOne({ username: postAuthorUsername });
          if (user) {
            const newReportCount = ((user as any).reportCount || 0) + 1;
            const shouldSuspend = newReportCount >= 5;

            const updateData: any = { reportCount: newReportCount, updatedAt: new Date() };
            if (shouldSuspend && !(user as any).isSuspended) {
              updateData.isSuspended = true;
              updateData.suspensionReason = 'community_reports';
              updateData.suspensionDetails = `Your account was suspended because it received ${newReportCount} reports from the community for violating Reelsy guidelines. You may appeal this decision.`;
              updateData.suspendedAt = new Date();
            }
            await usersCollection.updateOne({ username: postAuthorUsername }, { $set: updateData });

            if (shouldSuspend && !(user as any).isSuspended) {
              return res.json({ message: 'Report submitted', suspended: true });
            }
          }
        }
      }
    }

    return res.json({ message: 'Report submitted', suspended: false });
  } catch (error) {
    req.log.error(error, 'Error reporting post');
    // Non-fatal — always return success to user
    return res.json({ message: 'Report submitted', suspended: false });
  }
});

export default router;
