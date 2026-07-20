import { Router } from 'express';
import { getMongoDBCollection } from '../lib/mongodb';

const router = Router();

const BUILTIN_HASHTAGS = [
  '#design', '#afrobeats', '#fyp', '#Lagos', '#AI', '#minimalism', '#creativity',
  '#startup', '#music', '#fashion', '#film', '#wellness', '#tech', '#culture',
  '#broadcast', '#reelsy', '#photography', '#travel', '#nature', '#fitness',
  '#food', '#art', '#lifestyle', '#coding', '#vlog', '#entertainment', '#business',
  '#growth', '#vibes', '#news', '#web3', '#reactjs', '#engineering', '#frontend',
  '#uidesign', '#ux', '#motivation', '#nigeria', '#musicproducer', '#songwriter',
  '#creativewriting', '#poetry', '#artgallery', '#indiegame', '#cybersecurity',
  '#cloud', '#developer', '#gamedev', '#marketing', '#seo', '#blockchain',
];

// GET /api/hashtags/trending — top hashtags (built-in + user-created)
router.get('/hashtags/trending', async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const col = await getMongoDBCollection('hashtags');

    // Get user-created hashtags sorted by use count
    const userTags = await col
      .find({})
      .sort({ count: -1 })
      .limit(Number(limit))
      .toArray();

    const userTagNames = userTags.map((t: any) => t.tag);

    // Merge built-ins (not already in user list) at end
    const allTags = [
      ...userTagNames,
      ...BUILTIN_HASHTAGS.filter((t) => !userTagNames.includes(t)),
    ].slice(0, Number(limit));

    return res.json({ hashtags: allTags, userCreated: userTagNames });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch hashtags' });
  }
});

// POST /api/hashtags/track — increment hashtag counts (called when a post is created)
router.post('/hashtags/track', async (req, res) => {
  try {
    const { tags } = req.body as { tags: string[] };
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array required' });
    }

    const col = await getMongoDBCollection('hashtags');

    // Upsert each tag
    await Promise.all(
      tags.slice(0, 20).map((tag: string) => {
        const normalized = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
        return col.updateOne(
          { tag: normalized },
          { $inc: { count: 1 }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
      })
    );

    return res.json({ tracked: tags.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track hashtags' });
  }
});

// GET /api/hashtags/search?q=design&limit=20 — search hashtags + related posts
router.get('/hashtags/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q required' });

    const normalized = q.startsWith('#') ? q.toLowerCase() : `#${q.toLowerCase()}`;

    // Search hashtag collection
    const col = await getMongoDBCollection('hashtags');
    const regex = new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matchedTags = await col
      .find({ tag: regex })
      .sort({ count: -1 })
      .limit(10)
      .toArray();

    // Also search built-in tags
    const builtinMatches = BUILTIN_HASHTAGS.filter((t) => t.toLowerCase().includes(q.toLowerCase().replace(/^#/, '')));

    // Get posts containing this hashtag
    const postsCol = await getMongoDBCollection('posts');
    const posts = await postsCol
      .find({ content: { $regex: normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })
      .sort({ _id: -1 })
      .limit(Number(limit))
      .toArray();

    const postsWithCounts = posts.map((p: any) => ({
      ...p,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      repostsCount: Array.isArray(p.reposts) ? p.reposts.length : 0,
      savesCount: Array.isArray(p.saves) ? p.saves.length : 0,
    }));

    const suggestions = [
      ...matchedTags.map((t: any) => ({ tag: t.tag, count: t.count, userCreated: true })),
      ...builtinMatches
        .filter((t) => !matchedTags.find((m: any) => m.tag === t))
        .map((t) => ({ tag: t, count: 0, userCreated: false })),
    ].slice(0, 10);

    return res.json({ suggestions, posts: postsWithCounts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to search hashtags' });
  }
});

export default router;
