import { Collection, ObjectId } from 'mongodb';
import { connectMongoDB, getUsersCollection } from './mongodb';
import { broadcastNotification } from './supabase';

export interface Post {
  _id?: ObjectId;
  userId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  content: string;
  mediaUrls?: string[];
  tier: 'free' | 'premium' | 'premium+' | 'gold' | 'verified';
  
  // Retention
  retentionHours?: number;
  createdAt: Date;
  expiresAt?: Date;
  
  // Engagement counts (denormalized for fast reads)
  engagementCounts: {
    likes: number;
    comments: number;
    reshares: number;
    saves: number;
  };
}

export interface Engagement {
  _id?: ObjectId;
  postId: ObjectId;
  userId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  type: 'like' | 'comment' | 'reshare' | 'save';
  commentText?: string;
  createdAt: Date;
}

export interface Notification {
  _id?: ObjectId;
  userId: string; // Recipient's userId (supabaseId preferred)
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromProfileImage?: string;
  type: 'like' | 'comment' | 'reshare' | 'save' | 'profile_view';
  postId?: ObjectId;
  postPreview?: string;
  commentText?: string;
  read: boolean;
  createdAt: Date;
}

export async function getPostsCollection(): Promise<Collection<Post>> {
  const db = await connectMongoDB();
  const collection = db.collection<Post>('posts');
  
  // Create indexes
  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.createIndex({ username: 1 });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  return collection;
}

export async function getEngagementCollection(): Promise<Collection<Engagement>> {
  const db = await connectMongoDB();
  const collection = db.collection<Engagement>('engagement');
  
  // Create indexes
  await collection.createIndex({ postId: 1, type: 1 });
  await collection.createIndex({ postId: 1, userId: 1, type: 1 }, { unique: true });
  await collection.createIndex({ userId: 1 });
  
  return collection;
}

export async function getNotificationsCollection(): Promise<Collection<Notification>> {
  const db = await connectMongoDB();
  const collection = db.collection<Notification>('notifications');
  
  // Create indexes
  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.createIndex({ userId: 1, read: 1 });
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
  
  return collection;
}

// Helper: Like a post
export async function likePost(postId: string, userId: string, username: string, displayName: string, profileImage?: string): Promise<{ success: boolean; likeCount: number }> {
  const engagementCollection = await getEngagementCollection();
  const postsCollection = await getPostsCollection();
  
  const objectId = new ObjectId(postId);
  
  try {
    // Check if already liked
    const existing = await engagementCollection.findOne({ postId: objectId, userId, type: 'like' });
    
    if (existing) {
      return { success: false, likeCount: 0 }; // Already liked
    }
    
    // Add like
    await engagementCollection.insertOne({
      postId: objectId,
      userId,
      username,
      displayName,
      profileImage,
      type: 'like',
      createdAt: new Date(),
    });
    
    // Update post engagement count
    const post = await postsCollection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { 'engagementCounts.likes': 1 } },
      { returnDocument: 'after' }
    );
    
    if (!post) return { success: false, likeCount: 0 };
    
    // Create notification
    if (post.userId !== userId) {
      const notificationsCollection = await getNotificationsCollection();
      const notif = {
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'like' as const,
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        read: false,
        createdAt: new Date(),
      };
      const inserted = await notificationsCollection.insertOne(notif);
      broadcastNotification({ ...notif, _id: inserted.insertedId.toString(), postId: objectId.toString(), createdAt: notif.createdAt.toISOString() }).catch(() => {});
    }
    
    return { success: true, likeCount: post.engagementCounts.likes + 1 };
  } catch (error) {
    console.error('Error liking post:', error);
    return { success: false, likeCount: 0 };
  }
}

// Helper: Unlike a post
export async function unlikePost(postId: string, userId: string): Promise<{ success: boolean; likeCount: number }> {
  const engagementCollection = await getEngagementCollection();
  const postsCollection = await getPostsCollection();
  
  const objectId = new ObjectId(postId);
  
  try {
    // Remove like
    await engagementCollection.deleteOne({ postId: objectId, userId, type: 'like' });
    
    // Update post engagement count
    const post = await postsCollection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { 'engagementCounts.likes': -1 } },
      { returnDocument: 'after' }
    );
    
    if (!post) return { success: false, likeCount: 0 };
    
    return { success: true, likeCount: Math.max(0, post.engagementCounts.likes - 1) };
  } catch (error) {
    console.error('Error unliking post:', error);
    return { success: false, likeCount: 0 };
  }
}

// Helper: Add comment
export async function addComment(postId: string, userId: string, username: string, displayName: string, text: string, profileImage?: string): Promise<{ success: boolean; commentCount: number; commentId?: string }> {
  const engagementCollection = await getEngagementCollection();
  const postsCollection = await getPostsCollection();
  
  const objectId = new ObjectId(postId);
  
  try {
    // Add comment
    const result = await engagementCollection.insertOne({
      postId: objectId,
      userId,
      username,
      displayName,
      profileImage,
      type: 'comment',
      commentText: text,
      createdAt: new Date(),
    });
    
    // Update post engagement count
    const post = await postsCollection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { 'engagementCounts.comments': 1 } },
      { returnDocument: 'after' }
    );
    
    if (!post) return { success: false, commentCount: 0 };
    
    // Create notification
    if (post.userId !== userId) {
      const notificationsCollection = await getNotificationsCollection();
      const notif = {
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'comment' as const,
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        commentText: text.slice(0, 200),
        read: false,
        createdAt: new Date(),
      };
      const inserted = await notificationsCollection.insertOne(notif);
      broadcastNotification({ ...notif, _id: inserted.insertedId.toString(), postId: objectId.toString(), createdAt: notif.createdAt.toISOString() }).catch(() => {});
    }
    
    return { success: true, commentCount: post.engagementCounts.comments + 1, commentId: result.insertedId.toString() };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, commentCount: 0 };
  }
}

// Helper: Reshare post
export async function resharePost(postId: string, userId: string, username: string, displayName: string, profileImage?: string): Promise<{ success: boolean; reshareCount: number }> {
  const engagementCollection = await getEngagementCollection();
  const postsCollection = await getPostsCollection();
  
  const objectId = new ObjectId(postId);
  
  try {
    // Check if already reshared
    const existing = await engagementCollection.findOne({ postId: objectId, userId, type: 'reshare' });
    
    if (existing) {
      return { success: false, reshareCount: 0 }; // Already reshared
    }

    // Prevent resharing your own post
    const postData = await postsCollection.findOne({ _id: objectId });
    if (!postData) return { success: false, reshareCount: 0 };
    const postDoc = postData as any;
    const isSelfPost =
      (postDoc.userId && postDoc.userId === userId) ||
      (postDoc.authorUsername && postDoc.authorUsername === username);
    if (isSelfPost) {
      return { success: false, reshareCount: 0 };
    }
    
    // Add reshare
    await engagementCollection.insertOne({
      postId: objectId,
      userId,
      username,
      displayName,
      profileImage,
      type: 'reshare',
      createdAt: new Date(),
    });
    
    // Update post engagement count
    const post = await postsCollection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { 'engagementCounts.reshares': 1 } },
      { returnDocument: 'after' }
    );
    
    if (!post) return { success: false, reshareCount: 0 };
    
    // Create notification
    if (post.userId !== userId) {
      const notificationsCollection = await getNotificationsCollection();
      const notif = {
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'reshare' as const,
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        read: false,
        createdAt: new Date(),
      };
      const inserted = await notificationsCollection.insertOne(notif);
      broadcastNotification({ ...notif, _id: inserted.insertedId.toString(), postId: objectId.toString(), createdAt: notif.createdAt.toISOString() }).catch(() => {});
    }
    
    return { success: true, reshareCount: post.engagementCounts.reshares + 1 };
  } catch (error) {
    console.error('Error resharing post:', error);
    return { success: false, reshareCount: 0 };
  }
}

// Helper: Save post
export async function savePost(postId: string, userId: string, username: string, displayName: string, profileImage?: string): Promise<{ success: boolean; saved: boolean }> {
  const engagementCollection = await getEngagementCollection();
  const postsCollection = await getPostsCollection();
  
  const objectId = new ObjectId(postId);
  
  try {
    // Check if already saved
    const existing = await engagementCollection.findOne({ postId: objectId, userId, type: 'save' });
    
    if (existing) {
      // Unsave
      await engagementCollection.deleteOne({ postId: objectId, userId, type: 'save' });
      return { success: true, saved: false };
    }
    
    // Add save
    await engagementCollection.insertOne({
      postId: objectId,
      userId,
      username,
      displayName,
      profileImage,
      type: 'save',
      createdAt: new Date(),
    });
    
    // Update post engagement count
    await postsCollection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { 'engagementCounts.saves': 1 } },
      { returnDocument: 'after' }
    );
    
    return { success: true, saved: true };
  } catch (error) {
    console.error('Error saving post:', error);
    return { success: false, saved: false };
  }
}

// Helper: Get user notifications
// Accepts username as fallback for cases where userId stored as _id string instead of supabaseId
export async function getUserNotifications(userId: string, limit: number = 20, username?: string): Promise<Notification[]> {
  const notificationsCollection = await getNotificationsCollection();
  const query = username
    ? { $or: [{ userId }, { userId: username }] }
    : { userId };
  return notificationsCollection
    .find(query as any)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// Helper: Create a profile_view notification (throttled: once per viewer per profile per day)
export async function notifyProfileView(
  viewerUserId: string,
  viewerUsername: string,
  viewerDisplayName: string,
  viewerProfileImage: string | undefined,
  profileOwnerId: string,
  profileOwnerUsername: string
): Promise<void> {
  if (viewerUserId === profileOwnerId || viewerUsername === profileOwnerUsername) return;

  // Resolve the profile owner's supabaseId so the notification matches polling userId
  let realOwnerId = profileOwnerId;
  try {
    const usersCol = await getUsersCollection();
    const owner = await usersCol.findOne({ username: profileOwnerUsername });
    if (owner) realOwnerId = (owner as any).supabaseId || owner._id?.toString() || profileOwnerId;
  } catch {}

  const notificationsCollection = await getNotificationsCollection();

  // Throttle: only one profile_view notification per viewer+owner per 24 h
  const oneDayAgo = new Date(Date.now() - 86400000);
  const recent = await notificationsCollection.findOne({
    userId: realOwnerId,
    fromUserId: viewerUserId,
    type: 'profile_view',
    createdAt: { $gte: oneDayAgo },
  });
  if (recent) return; // already notified recently

  const notif = {
    userId: realOwnerId,
    fromUserId: viewerUserId,
    fromUsername: viewerUsername,
    fromDisplayName: viewerDisplayName,
    fromProfileImage: viewerProfileImage,
    type: 'profile_view' as const,
    read: false,
    createdAt: new Date(),
  };
  const inserted = await notificationsCollection.insertOne(notif as any);
  broadcastNotification({ ...notif, _id: inserted.insertedId.toString(), createdAt: notif.createdAt.toISOString() }).catch(() => {});
}

// Helper: Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const notificationsCollection = await getNotificationsCollection();
  
  const result = await notificationsCollection.updateOne(
    { _id: new ObjectId(notificationId) },
    { $set: { read: true } }
  );
  
  return result.modifiedCount > 0;
}

/** Returns true when postId looks like a valid MongoDB ObjectId (24-char hex). */
function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

// Helper: Get post comments
export async function getPostComments(postId: string, limit: number = 20): Promise<Engagement[]> {
  if (!isValidObjectId(postId)) return [];
  const engagementCollection = await getEngagementCollection();
  
  return engagementCollection
    .find({ postId: new ObjectId(postId), type: 'comment' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// Helper: Check if user liked post
export async function userLikedPost(postId: string, userId: string): Promise<boolean> {
  if (!isValidObjectId(postId)) return false;
  const engagementCollection = await getEngagementCollection();
  
  const like = await engagementCollection.findOne({
    postId: new ObjectId(postId),
    userId,
    type: 'like',
  });
  
  return !!like;
}

// Helper: Check if user saved post
export async function userSavedPost(postId: string, userId: string): Promise<boolean> {
  if (!isValidObjectId(postId)) return false;
  const engagementCollection = await getEngagementCollection();
  
  const save = await engagementCollection.findOne({
    postId: new ObjectId(postId),
    userId,
    type: 'save',
  });
  
  return !!save;
}
