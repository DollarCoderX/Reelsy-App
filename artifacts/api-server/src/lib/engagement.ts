import { Collection, ObjectId } from 'mongodb';
import { connectMongoDB } from './mongodb';

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
  userId: string; // Post owner receiving notification
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromProfileImage?: string;
  type: 'like' | 'comment' | 'reshare' | 'save';
  postId: ObjectId;
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
      await notificationsCollection.insertOne({
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'like',
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        read: false,
        createdAt: new Date(),
      });
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
      await notificationsCollection.insertOne({
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'comment',
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        commentText: text.slice(0, 200),
        read: false,
        createdAt: new Date(),
      });
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
      await notificationsCollection.insertOne({
        userId: post.userId,
        fromUserId: userId,
        fromUsername: username,
        fromDisplayName: displayName,
        fromProfileImage: profileImage,
        type: 'reshare',
        postId: objectId,
        postPreview: post.content.slice(0, 100),
        read: false,
        createdAt: new Date(),
      });
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
export async function getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  const notificationsCollection = await getNotificationsCollection();
  
  return notificationsCollection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
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

// Helper: Get post comments
export async function getPostComments(postId: string, limit: number = 20): Promise<Engagement[]> {
  const engagementCollection = await getEngagementCollection();
  
  return engagementCollection
    .find({ postId: new ObjectId(postId), type: 'comment' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// Helper: Check if user liked post
export async function userLikedPost(postId: string, userId: string): Promise<boolean> {
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
  const engagementCollection = await getEngagementCollection();
  
  const save = await engagementCollection.findOne({
    postId: new ObjectId(postId),
    userId,
    type: 'save',
  });
  
  return !!save;
}
