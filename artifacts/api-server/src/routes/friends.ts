/**
 * Friend requests and friendships — stored in MongoDB.
 * Uses username-based matching (case-insensitive) as primary key.
 * No longer depends on Supabase tables for friend data.
 *
 * IMPORTANT: userId used here must match what the frontend computes:
 *   user?.supabaseId || user?.username
 * So resolveUserInfo returns supabaseId OR normalized username — never _id.toString().
 */
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDBCollection, getUsersCollection } from '../lib/mongodb';
import { broadcastNotification } from '../lib/supabase';

const router = Router();

function cleanUsername(u: string): string {
  return u.replace(/^@/, '').toLowerCase().trim();
}

async function resolveUserInfo(username: string): Promise<{ userId: string; displayName: string; avatar: string } | null> {
  const usersCollection = await getUsersCollection();
  const clean = cleanUsername(username);
  const user = await usersCollection.findOne({
    $or: [
      { username: clean },
      { username: '@' + clean },
      { username: { $regex: new RegExp('^@?' + clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
    ],
  });
  if (!user) return null;
  // Must match frontend: user?.supabaseId || user?.username (NOT _id.toString())
  const storedUsername = cleanUsername((user as any).username || clean);
  return {
    userId: (user as any).supabaseId || storedUsername,
    displayName: (user as any).displayName || username,
    avatar: (user as any).profileImage || '',
  };
}

/**
 * Persist notification to MongoDB (so polling picks it up) AND broadcast via
 * Supabase Realtime for instant delivery. Non-fatal if either fails.
 */
async function persistAndBroadcast(notif: Record<string, any>): Promise<void> {
  try {
    const notifCol = await getMongoDBCollection('notifications');
    const doc = { ...notif, read: false, createdAt: notif.createdAt || new Date().toISOString() };
    const inserted = await notifCol.insertOne(doc);
    broadcastNotification({ ...doc, _id: inserted.insertedId.toString() }).catch(() => {});
  } catch {
    broadcastNotification(notif).catch(() => {});
  }
}

// ── POST /api/friends/request ─────────────────────────────────────────────────
router.post('/friends/request', async (req, res) => {
  try {
    const { fromUserId, fromUsername, fromDisplayName, fromAvatar, toUsername } = req.body;
    if (!fromUsername || !toUsername) {
      return res.status(400).json({ error: 'fromUsername and toUsername required' });
    }

    const fromClean = cleanUsername(fromUsername);
    const toClean = cleanUsername(toUsername);

    if (fromClean === toClean) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const toInfo = await resolveUserInfo(toClean);
    if (!toInfo) return res.status(404).json({ error: 'User not found' });

    const [reqCol, friendsCol] = await Promise.all([
      getMongoDBCollection('friend_requests'),
      getMongoDBCollection('friends'),
    ]);

    // Check existing pending request (either direction)
    const existing = await reqCol.findOne({
      $or: [
        { fromUsername: fromClean, toUsername: toClean },
        { fromUsername: toClean, toUsername: fromClean },
      ],
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ error: 'Friend request already pending', requestId: (existing._id as ObjectId).toString() });
    }

    // Check already friends
    const friendship = await friendsCol.findOne({
      $or: [
        { username: fromClean, friendUsername: toClean },
        { username: toClean, friendUsername: fromClean },
      ],
    });
    if (friendship) return res.status(409).json({ error: 'Already friends' });

    // Resolve sender info so we have a consistent userId
    const fromInfo = await resolveUserInfo(fromClean);
    const resolvedFromUserId = fromInfo?.userId || fromUserId || fromClean;

    const now = new Date();
    const result = await reqCol.insertOne({
      fromUserId: resolvedFromUserId,
      fromUsername: fromClean,
      fromDisplayName: fromDisplayName || fromUsername,
      fromAvatar: fromAvatar || null,
      toUserId: toInfo.userId,
      toUsername: toClean,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const requestId = result.insertedId.toString();

    // Persist to MongoDB notifications + broadcast (so recipient sees it via polling AND realtime)
    persistAndBroadcast({
      userId: toInfo.userId,
      fromUserId: resolvedFromUserId,
      fromUsername: fromClean,
      fromDisplayName: fromDisplayName || fromUsername,
      fromProfileImage: fromAvatar || null,
      type: 'friend_request',
      requestId,
      createdAt: now.toISOString(),
    }).catch(() => {});

    return res.status(201).json({ message: 'Friend request sent', requestId });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ── PUT /api/friends/request/:id/accept ──────────────────────────────────────
router.put('/friends/request/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request ID' });

    const reqCol = await getMongoDBCollection('friend_requests');
    const request = await reqCol.findOne({ _id: new ObjectId(id) });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if ((request as any).status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    await reqCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'accepted', updatedAt: new Date() } }
    );

    const fromUsername = cleanUsername((request as any).fromUsername);
    const toUsername = cleanUsername((request as any).toUsername);

    const [fromInfo, toInfo] = await Promise.all([
      resolveUserInfo(fromUsername),
      resolveUserInfo(toUsername),
    ]);

    const friendsCol = await getMongoDBCollection('friends');
    const now = new Date();

    // Add bidirectional friendship
    await Promise.all([
      friendsCol.updateOne(
        { username: fromUsername, friendUsername: toUsername },
        {
          $set: {
            userId: fromInfo?.userId || (request as any).fromUserId,
            friendId: toInfo?.userId || (request as any).toUserId,
            friendDisplayName: toInfo?.displayName || toUsername,
            friendAvatar: toInfo?.avatar || null,
            createdAt: now,
          },
        },
        { upsert: true }
      ),
      friendsCol.updateOne(
        { username: toUsername, friendUsername: fromUsername },
        {
          $set: {
            userId: toInfo?.userId || (request as any).toUserId,
            friendId: fromInfo?.userId || (request as any).fromUserId,
            friendDisplayName: fromInfo?.displayName || fromUsername,
            friendAvatar: fromInfo?.avatar || null,
            createdAt: now,
          },
        },
        { upsert: true }
      ),
    ]);

    // Notify the original sender that their request was accepted
    persistAndBroadcast({
      userId: fromInfo?.userId || (request as any).fromUserId,
      fromUserId: toInfo?.userId || (request as any).toUserId,
      fromUsername: toUsername,
      fromDisplayName: toInfo?.displayName || toUsername,
      fromProfileImage: toInfo?.avatar || null,
      type: 'friend_accepted',
      requestId: id,
      createdAt: now.toISOString(),
    }).catch(() => {});

    return res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// ── PUT /api/friends/request/:id/decline ─────────────────────────────────────
router.put('/friends/request/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request ID' });

    const reqCol = await getMongoDBCollection('friend_requests');
    await reqCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'declined', updatedAt: new Date() } }
    );

    return res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    return res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// ── GET /api/friends/requests/incoming?userId= ────────────────────────────────
router.get('/friends/requests/incoming', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const reqCol = await getMongoDBCollection('friend_requests');
    const userIdStr = userId as string;
    const cleanId = cleanUsername(userIdStr);

    const requests = await reqCol
      .find({
        $or: [{ toUserId: userIdStr }, { toUsername: cleanId }],
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const mapped = requests.map((r: any) => ({
      _id: r._id.toString(),
      id: r._id.toString(),
      fromUserId: r.fromUserId,
      fromUsername: r.fromUsername,
      fromDisplayName: r.fromDisplayName,
      fromAvatar: r.fromAvatar,
      toUserId: r.toUserId,
      toUsername: r.toUsername,
      status: r.status,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
    }));

    return res.json({ requests: mapped });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// ── GET /api/friends/requests/outgoing?userId= ────────────────────────────────
router.get('/friends/requests/outgoing', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const reqCol = await getMongoDBCollection('friend_requests');
    const userIdStr = userId as string;
    const cleanId = cleanUsername(userIdStr);

    const requests = await reqCol
      .find({
        $or: [{ fromUserId: userIdStr }, { fromUsername: cleanId }],
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const mapped = requests.map((r: any) => ({
      _id: r._id.toString(),
      id: r._id.toString(),
      fromUserId: r.fromUserId,
      fromUsername: r.fromUsername,
      fromDisplayName: r.fromDisplayName,
      fromAvatar: r.fromAvatar,
      toUserId: r.toUserId,
      toUsername: r.toUsername,
      status: r.status,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
    }));

    return res.json({ requests: mapped });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch outgoing requests' });
  }
});

// ── GET /api/friends/status?fromUserId=&toUsername= ──────────────────────────
router.get('/friends/status', async (req, res) => {
  try {
    const { fromUserId, toUsername } = req.query;
    if (!fromUserId || !toUsername) {
      return res.status(400).json({ error: 'fromUserId and toUsername required' });
    }

    const fromIdStr = fromUserId as string;
    const toClean = cleanUsername(toUsername as string);

    // fromUserId may be a Supabase UUID — resolve to the actual username
    // so we can query the friends collection (which only stores usernames).
    const usersCol = await getUsersCollection();
    const fromUser = await usersCol.findOne({
      $or: [
        { supabaseId: fromIdStr },
        { username: cleanUsername(fromIdStr) },
      ],
    });
    const fromClean = fromUser
      ? cleanUsername((fromUser as any).username || fromIdStr)
      : cleanUsername(fromIdStr);

    const [reqCol, friendsCol] = await Promise.all([
      getMongoDBCollection('friend_requests'),
      getMongoDBCollection('friends'),
    ]);

    // Already friends?
    const friendship = await friendsCol.findOne({
      $or: [
        { username: fromClean, friendUsername: toClean },
        { username: toClean, friendUsername: fromClean },
      ],
    });
    if (friendship) return res.json({ status: 'friends' });

    // Outgoing request (I sent to them) — match by userId OR resolved username
    const outgoing = await reqCol.findOne({
      $or: [
        { fromUserId: fromIdStr, toUsername: toClean },
        { fromUsername: fromClean, toUsername: toClean },
      ],
      status: 'pending',
    });
    if (outgoing) return res.json({ status: 'request_sent', requestId: (outgoing._id as ObjectId).toString() });

    // Incoming request (they sent to me)
    const incoming = await reqCol.findOne({
      $or: [
        { fromUsername: toClean, toUserId: fromIdStr },
        { fromUsername: toClean, toUsername: fromClean },
      ],
      status: 'pending',
    });
    if (incoming) return res.json({ status: 'request_received', requestId: (incoming._id as ObjectId).toString() });

    return res.json({ status: 'none' });
  } catch (error) {
    console.error('Error fetching friend status:', error);
    return res.status(500).json({ error: 'Failed to get friend status' });
  }
});

// ── GET /api/friends/:username ────────────────────────────────────────────────
router.get('/friends/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUname = cleanUsername(username);

    const friendsCol = await getMongoDBCollection('friends');
    const friendRows = await friendsCol
      .find({ username: cleanUname })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (friendRows.length === 0) {
      return res.json({ friends: [], count: 0 });
    }

    // Enrich with full profile from MongoDB
    const usersCollection = await getUsersCollection();
    const usernames = friendRows.map((f: any) => f.friendUsername);
    const profiles = await usersCollection
      .find({ username: { $in: usernames } })
      .project({ emailPassword: 0, strikes: 0, userEmail: 0 })
      .toArray();

    const profileMap = new Map(profiles.map((p: any) => [cleanUsername(p.username), p]));
    const friends = friendRows.map((f: any) =>
      profileMap.get(f.friendUsername) || {
        username: f.friendUsername,
        displayName: f.friendDisplayName,
        profileImage: f.friendAvatar,
      }
    );

    return res.json({ friends, count: friends.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ── DELETE /api/friends/:friendUsername?username= ─────────────────────────────
router.delete('/friends/:friendUsername', async (req, res) => {
  try {
    const { friendUsername } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    const myClean = cleanUsername(username as string);
    const theirClean = cleanUsername(friendUsername);

    const friendsCol = await getMongoDBCollection('friends');
    await Promise.all([
      friendsCol.deleteMany({ username: myClean, friendUsername: theirClean }),
      friendsCol.deleteMany({ username: theirClean, friendUsername: myClean }),
    ]);

    return res.json({ message: 'Unfriended successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unfriend' });
  }
});

export default router;
