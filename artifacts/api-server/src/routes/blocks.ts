import { Router } from 'express';
import { getMongoDBCollection } from '../lib/mongodb';

const router = Router();

// POST /api/users/block - block or mute a user
router.post('/users/block', async (req, res) => {
  try {
    const { username, targetUsername, action } = req.body;
    // action: 'block' | 'mute' | 'unblock' | 'unmute'
    if (!username || !targetUsername) {
      return res.status(400).json({ error: 'username and targetUsername required' });
    }
    if (username === targetUsername) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const collection = await getMongoDBCollection('blocks');
    const type = action === 'mute' || action === 'unmute' ? 'mute' : 'block';

    if (action === 'unblock' || action === 'unmute') {
      await collection.deleteOne({ username, targetUsername, type });
      return res.json({ message: `${action === 'unblock' ? 'Unblocked' : 'Unmuted'} successfully` });
    }

    // Upsert so duplicate blocks are idempotent
    await collection.updateOne(
      { username, targetUsername, type },
      { $set: { username, targetUsername, type, createdAt: new Date() } },
      { upsert: true }
    );

    return res.json({ message: `${type === 'mute' ? 'Muted' : 'Blocked'} successfully` });
  } catch (error) {
    console.error('Block/mute error:', error);
    return res.status(500).json({ error: 'Failed to block/mute user' });
  }
});

// GET /api/users/blocks - get list of blocked/muted usernames
router.get('/users/blocks', async (req, res) => {
  try {
    const { username, type } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });
    const collection = await getMongoDBCollection('blocks');
    const query: any = { username };
    if (type) query.type = type;
    const blocks = await collection.find(query).toArray();
    return res.json({ blocks });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get blocks' });
  }
});

export default router;
