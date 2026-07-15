import { Router } from 'express';
import { getUsersCollection } from '../lib/mongodb';

const router = Router();

// GET /api/users/search - search users
router.get('/users/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const usersCollection = await getUsersCollection();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const users = await usersCollection.find({
      $or: [
        { username: regex },
        { displayName: regex },
        { userEmail: q }, // exact email match for privacy
      ],
      isBanned: { $ne: true },
      isSuspended: { $ne: true },
    })
      .limit(Number(limit))
      .project({ emailPassword: 0, strikes: 0 })
      .toArray();

    // Attach follower counts from the friends collection (bidirectional friend model)
    const friendsCollection = await import('../lib/mongodb').then(m => m.getMongoDBCollection('friends'));
    const usernames = users.map((u: any) => u.username);
    const friendCounts = await friendsCollection.aggregate([
      { $match: { friendUsername: { $in: usernames } } },
      { $group: { _id: '$friendUsername', count: { $sum: 1 } } },
    ]).toArray();
    const countMap: Record<string, number> = {};
    for (const row of friendCounts) countMap[row._id] = row.count;
    const usersWithCount = users.map((u: any) => ({ ...u, followersCount: countMap[u.username] || 0 }));

    return res.json({ users: usersWithCount });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/suggestions - get user suggestions (for "follow" suggestions)
router.get('/users/suggestions', async (req, res) => {
  try {
    const { username, limit = 10 } = req.query;
    const usersCollection = await getUsersCollection();

    const query: any = {
      isBanned: { $ne: true },
      isSuspended: { $ne: true },
    };
    if (username) query.username = { $ne: username };

    const users = await usersCollection.find(query)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .project({ emailPassword: 0, strikes: 0, userEmail: 0 })
      .toArray();

    return res.json({ users });
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    return res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// POST /api/users/phone - update phone number
router.post('/users/phone', async (req, res) => {
  try {
    const { username, phone } = req.body;
    if (!username || !phone) return res.status(400).json({ error: 'username and phone required' });

    const usersCollection = await getUsersCollection();
    const result = await usersCollection.updateOne(
      { username },
      { $set: { phone, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'Phone updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update phone' });
  }
});

// GET /api/users/:username/followers - get follower count
router.get('/users/:username/followers', async (req, res) => {
  try {
    const { username } = req.params;
    const followsCollection = await import('../lib/mongodb').then(m => m.getMongoDBCollection('follows'));
    const count = await followsCollection.countDocuments({ followingUsername: username });
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get follower count' });
  }
});

// POST /api/users/follow - follow a user
router.post('/users/follow', async (req, res) => {
  try {
    const { followerUsername, followingUsername } = req.body;
    if (!followerUsername || !followingUsername) return res.status(400).json({ error: 'Both usernames required' });

    const followsCollection = await import('../lib/mongodb').then(m => m.getMongoDBCollection('follows'));
    const existing = await followsCollection.findOne({ followerUsername, followingUsername });

    if (existing) {
      await followsCollection.deleteOne({ followerUsername, followingUsername });
      return res.json({ following: false });
    } else {
      await followsCollection.insertOne({ followerUsername, followingUsername, createdAt: new Date() });
      return res.json({ following: true });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

// PATCH /api/users/:username/phone - update phone number (auth required)
router.patch('/users/:username/phone', async (req, res) => {
  try {
    const { username } = req.params;
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const usersCollection = await getUsersCollection();
    const result = await usersCollection.updateOne(
      { username: username.toLowerCase() },
      { $set: { phone: phone.trim(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'Phone number updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update phone number' });
  }
});

// GET /api/users/:username/stats - get user stats (friends count, posts count)
router.get('/users/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const [friendsCollection, postsCollection] = await Promise.all([
      import('../lib/mongodb').then(m => m.getMongoDBCollection('friends')),
      import('../lib/mongodb').then(m => m.getMongoDBCollection('posts')),
    ]);

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userId = (user as any).supabaseId || user._id?.toString() || username;

    const [friendCount, postCount] = await Promise.all([
      friendsCollection.countDocuments({ userId }),
      postsCollection.countDocuments({ authorUsername: username }),
    ]);

    return res.json({ friendCount, postCount, username });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

// PATCH /api/users/:username/settings - save user privacy settings
// Requires caller to supply their supabaseId which is verified against the stored record.
router.patch('/users/:username/settings', async (req, res) => {
  try {
    const { username } = req.params;
    const { friendPolicy, messagingPolicy, bio, displayName, profileImage, callerSupabaseId } = req.body;

    const usersCollection = await getUsersCollection();

    // Basic ownership check: callerSupabaseId must match the stored supabaseId for this username
    const existingUser = await usersCollection.findOne({ username });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (callerSupabaseId && (existingUser as any).supabaseId) {
      if ((existingUser as any).supabaseId !== callerSupabaseId) {
        return res.status(403).json({ error: 'Forbidden: identity mismatch' });
      }
    }

    // Only update whitelisted safe fields
    const updateFields: any = { updatedAt: new Date() };
    if (friendPolicy !== undefined) {
      const allowed = ['open', 'request-only'];
      if (!allowed.includes(friendPolicy)) {
        return res.status(400).json({ error: 'Invalid friendPolicy value' });
      }
      updateFields.friendPolicy = friendPolicy;
    }
    if (messagingPolicy !== undefined) {
      const allowed = ['everyone', 'friends-only'];
      if (!allowed.includes(messagingPolicy)) {
        return res.status(400).json({ error: 'Invalid messagingPolicy value' });
      }
      updateFields.messagingPolicy = messagingPolicy;
    }
    if (bio !== undefined) updateFields.bio = String(bio).slice(0, 500);
    if (displayName !== undefined) updateFields.displayName = String(displayName).slice(0, 64);
    if (profileImage !== undefined) updateFields.profileImage = String(profileImage).slice(0, 500);

    await usersCollection.updateOne(
      { username },
      { $set: updateFields },
      { upsert: false }
    );

    return res.json({ message: 'Settings updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
