import { Router } from 'express';
import { getMongoDBCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

// GET /api/stories - get active stories (last 24h)
router.get('/stories', async (req, res) => {
  try {
    const collection = await getMongoDBCollection('stories');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await collection
      .find({ expiresAt: { $gt: new Date() }, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return res.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// GET /api/stories/mine - get stories by a specific user
router.get('/stories/mine', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });
    const collection = await getMongoDBCollection('stories');
    const stories = await collection
      .find({ authorUsername: username, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .toArray();
    return res.json({ stories });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// POST /api/stories - create a story (expires in 24h)
router.post('/stories', async (req, res) => {
  try {
    const { authorUsername, authorDisplayName, authorAvatar, media, type, content } = req.body;
    if (!authorUsername || !media) {
      return res.status(400).json({ error: 'authorUsername and media are required' });
    }
    const collection = await getMongoDBCollection('stories');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const story = {
      authorUsername,
      authorDisplayName: authorDisplayName || authorUsername,
      authorAvatar: authorAvatar || null,
      media,
      type: type || 'image',
      content: content || '',
      views: [] as string[],
      createdAt: now,
      expiresAt,
    };
    const result = await collection.insertOne(story);
    return res.status(201).json({ ...story, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating story:', error);
    return res.status(500).json({ error: 'Failed to create story' });
  }
});

// POST /api/stories/:id/view - mark story as viewed
router.post('/stories/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const collection = await getMongoDBCollection('stories');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { views: username } }
    );
    return res.json({ viewed: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to view story' });
  }
});

// DELETE /api/stories/:id - delete own story
router.delete('/stories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const collection = await getMongoDBCollection('stories');
    const story = await collection.findOne({ _id: new ObjectId(id) });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if ((story as any).authorUsername !== username) return res.status(403).json({ error: 'Forbidden' });
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.json({ message: 'Story deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete story' });
  }
});

export default router;
