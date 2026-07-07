import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDBCollection, getUsersCollection } from '../lib/mongodb';

const router = Router();

interface FriendRequest {
  _id?: ObjectId;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatar?: string;
  toUserId: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

async function getFriendRequestsCollection() {
  return getMongoDBCollection('friend_requests') as any;
}

async function getFriendsCollection() {
  return getMongoDBCollection('friends') as any;
}

async function getNotificationsCollection() {
  return getMongoDBCollection('notifications') as any;
}

// POST /api/friends/request — send a friend request
router.post('/friends/request', async (req, res) => {
  try {
    const { fromUserId, fromUsername, fromDisplayName, fromAvatar, toUsername } = req.body;
    if (!fromUserId || !fromUsername || !toUsername) {
      return res.status(400).json({ error: 'fromUserId, fromUsername, toUsername required' });
    }

    // Look up the target user
    const usersCollection = await getUsersCollection();
    const toUser = await usersCollection.findOne({ username: toUsername });
    if (!toUser) return res.status(404).json({ error: 'User not found' });

    const toUserId = toUser.supabaseId || toUser._id?.toString() || toUsername;

    // Don't friend yourself
    if (fromUserId === toUserId || fromUsername === toUsername) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const col = await getFriendRequestsCollection();

    // Check for existing request or friendship
    const existing = await col.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ error: 'Friend request already pending', requestId: existing._id });
    }

    // Check already friends
    const friendsCol = await getFriendsCollection();
    const alreadyFriends = await friendsCol.findOne({
      $or: [
        { userId: fromUserId, friendId: toUserId },
        { userId: toUserId, friendId: fromUserId },
      ],
    });
    if (alreadyFriends) return res.status(409).json({ error: 'Already friends' });

    const request: FriendRequest = {
      fromUserId,
      fromUsername,
      fromDisplayName: fromDisplayName || fromUsername,
      fromAvatar,
      toUserId,
      toUsername,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await col.insertOne(request);

    // Create notification for recipient
    const notifCol = await getNotificationsCollection();
    await notifCol.insertOne({
      userId: toUserId,
      fromUserId,
      fromUsername,
      fromDisplayName: fromDisplayName || fromUsername,
      fromProfileImage: fromAvatar,
      type: 'friend_request',
      requestId: result.insertedId,
      read: false,
      createdAt: new Date(),
    });

    return res.status(201).json({ requestId: result.insertedId, message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/friends/request/:id/accept
router.put('/friends/request/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // The person accepting (toUserId)
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const col = await getFriendRequestsCollection();
    const request = await col.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.toUserId !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'accepted', updatedAt: new Date() } }
    );

    // Create bidirectional friendship
    const friendsCol = await getFriendsCollection();
    const now = new Date();
    await friendsCol.insertMany([
      {
        userId: request.fromUserId,
        friendId: request.toUserId,
        username: request.fromUsername,
        friendUsername: request.toUsername,
        createdAt: now,
      },
      {
        userId: request.toUserId,
        friendId: request.fromUserId,
        username: request.toUsername,
        friendUsername: request.fromUsername,
        createdAt: now,
      },
    ]);

    // Notify the original sender
    const notifCol = await getNotificationsCollection();
    await notifCol.insertOne({
      userId: request.fromUserId,
      fromUserId: request.toUserId,
      fromUsername: request.toUsername,
      fromDisplayName: request.toUsername,
      type: 'friend_accepted',
      requestId: new ObjectId(id),
      read: false,
      createdAt: new Date(),
    });

    // Mark original friend_request notification as read
    await notifCol.updateOne(
      { type: 'friend_request', requestId: new ObjectId(id) },
      { $set: { read: true } }
    );

    return res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// PUT /api/friends/request/:id/decline
router.put('/friends/request/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const col = await getFriendRequestsCollection();
    const request = await col.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Either recipient can decline OR sender can cancel
    const isRecipient = request.toUserId === userId;
    const isSender = request.fromUserId === userId;
    if (!isRecipient && !isSender) return res.status(403).json({ error: 'Not authorized' });

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'declined', updatedAt: new Date() } }
    );

    // Remove related notification
    const notifCol = await getNotificationsCollection();
    await notifCol.deleteOne({ type: 'friend_request', requestId: new ObjectId(id) });

    return res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    return res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// GET /api/friends/requests/incoming?userId=
router.get('/friends/requests/incoming', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const col = await getFriendRequestsCollection();
    const requests = await col
      .find({ toUserId: userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// GET /api/friends/requests/outgoing?userId=
router.get('/friends/requests/outgoing', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const col = await getFriendRequestsCollection();
    const requests = await col
      .find({ fromUserId: userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch outgoing requests' });
  }
});

// GET /api/friends/status?fromUserId=&toUsername=
router.get('/friends/status', async (req, res) => {
  try {
    const { fromUserId, toUsername } = req.query;
    if (!fromUserId || !toUsername) {
      return res.status(400).json({ error: 'fromUserId and toUsername required' });
    }

    const usersCollection = await getUsersCollection();
    const toUser = await usersCollection.findOne({ username: toUsername as string });
    if (!toUser) return res.json({ status: 'not_found' });
    const toUserId = toUser.supabaseId || toUser._id?.toString() || toUsername;

    const col = await getFriendRequestsCollection();
    const friendsCol = await getFriendsCollection();

    // Check friendship
    const areFriends = await friendsCol.findOne({
      $or: [
        { userId: fromUserId, friendId: toUserId },
        { userId: toUserId, friendId: fromUserId },
      ],
    });
    if (areFriends) return res.json({ status: 'friends' });

    // Check pending request (sent by me)
    const sentRequest = await col.findOne({
      fromUserId,
      toUserId,
      status: 'pending',
    });
    if (sentRequest) return res.json({ status: 'request_sent', requestId: sentRequest._id });

    // Check pending request (received from them)
    const receivedRequest = await col.findOne({
      fromUserId: toUserId,
      toUserId: fromUserId as string,
      status: 'pending',
    });
    if (receivedRequest) return res.json({ status: 'request_received', requestId: receivedRequest._id });

    return res.json({ status: 'none' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check friend status' });
  }
});

// GET /api/friends/:username — get friends list
router.get('/friends/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const userId = user.supabaseId || user._id?.toString() || username;

    const friendsCol = await getFriendsCollection();
    const friendRecords = await friendsCol
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const friendUsernames = friendRecords.map((f: any) => f.friendUsername);

    // Fetch user profiles for all friends
    const friendProfiles = await usersCollection
      .find({ username: { $in: friendUsernames } })
      .project({ emailPassword: 0, strikes: 0, userEmail: 0 })
      .toArray();

    return res.json({ friends: friendProfiles, count: friendProfiles.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// DELETE /api/friends/:friendUsername?username=
router.delete('/friends/:friendUsername', async (req, res) => {
  try {
    const { friendUsername } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    const usersCollection = await getUsersCollection();
    const me = await usersCollection.findOne({ username: username as string });
    const them = await usersCollection.findOne({ username: friendUsername });
    if (!me || !them) return res.status(404).json({ error: 'User not found' });

    const myId = me.supabaseId || me._id?.toString() || username;
    const theirId = them.supabaseId || them._id?.toString() || friendUsername;

    const friendsCol = await getFriendsCollection();
    await friendsCol.deleteMany({
      $or: [
        { userId: myId, friendId: theirId },
        { userId: theirId, friendId: myId },
      ],
    });

    return res.json({ message: 'Unfriended successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unfriend' });
  }
});

export default router;
