import { Router } from 'express';
import { getMongoDBCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

interface Post {
  _id?: any;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'video';
  media?: string | string[];
  likes: string[];
  reposts: string[];
  saves: string[];
  views: number;
  music?: { title: string; artist: string; url: string };
  location?: { name: string; lat?: number; lng?: number };
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  _id?: any;
  postId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  likes: string[];
  replyTo?: string;
  createdAt: Date;
}

// GET /api/posts - get feed posts with cursor pagination
router.get('/posts', async (req, res) => {
  try {
    const { limit = 20, skip = 0, username, before } = req.query;
    const collection = await getMongoDBCollection('posts');

    const query: any = {};
    if (username) query.authorUsername = username;
    // Cursor-based pagination using _id (ObjectId encodes creation time, always monotonic)
    if (before) {
      try {
        query._id = { $lt: new ObjectId(String(before)) };
      } catch {}
    }

    const posts = await collection
      .find(query)
      .sort({ _id: -1 })   // sort by _id desc — consistent with cursor filtering
      .skip(before ? 0 : Number(skip))
      .limit(Number(limit))
      .toArray();

    // Attach engagement counts inline for frontend convenience
    const postsWithCounts = posts.map((p: any) => ({
      ...p,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      repostsCount: Array.isArray(p.reposts) ? p.reposts.length : 0,
      savesCount: Array.isArray(p.saves) ? p.saves.length : 0,
    }));

    const hasMore = posts.length === Number(limit);
    const nextCursor = hasMore ? String(posts[posts.length - 1]._id) : null;

    return res.json({ posts: postsWithCounts, hasMore, nextCursor });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/feed/friends?username=&limit=&before= — only posts from friends + self
router.get('/posts/feed/friends', async (req, res) => {
  try {
    const { username, limit = 20, before } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    // Get the user's Supabase ID
    const { getUsersCollection } = await import('../lib/mongodb');
    const usersCol = await getUsersCollection();
    const me = await usersCol.findOne({
      $or: [{ username: username as string }, { username: '@' + (username as string) }],
    });
    const myId = me ? ((me as any).supabaseId || me._id?.toString() || username) : null;

    let friendUsernames: string[] = [username as string];

    if (myId) {
      const { getSupabase } = await import('../lib/supabase');
      const sb = await getSupabase();
      const { data: friendRows } = await sb
        .from('friends')
        .select('friend_username')
        .eq('user_id', myId as string);

      if (friendRows && friendRows.length > 0) {
        friendUsernames = [...friendUsernames, ...friendRows.map((f: any) => f.friend_username)];
      }
    }

    const collection = await getMongoDBCollection('posts');
    const query: any = { authorUsername: { $in: friendUsernames } };
    if (before) {
      try { query._id = { $lt: new ObjectId(String(before)) }; } catch {}
    }

    const posts = await collection
      .find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .toArray();

    const postsWithCounts = posts.map((p: any) => ({
      ...p,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      repostsCount: Array.isArray(p.reposts) ? p.reposts.length : 0,
      savesCount: Array.isArray(p.saves) ? p.saves.length : 0,
    }));

    const hasMore = posts.length === Number(limit);
    const nextCursor = hasMore ? String(posts[posts.length - 1]._id) : null;

    return res.json({ posts: postsWithCounts, hasMore, nextCursor });
  } catch (error) {
    console.error('Error fetching friends feed:', error);
    return res.status(500).json({ error: 'Failed to fetch friends feed' });
  }
});

// GET /api/posts/trending - top posts by engagement in last 24h
router.get('/posts/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const collection = await getMongoDBCollection('posts');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch recent posts and score them by likes + reposts + views
    const posts = await collection
      .find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const scored = posts.map((p: any) => ({
      ...p,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      repostsCount: Array.isArray(p.reposts) ? p.reposts.length : 0,
      savesCount: Array.isArray(p.saves) ? p.saves.length : 0,
      score: (Array.isArray(p.likes) ? p.likes.length : 0) * 3 +
             (Array.isArray(p.reposts) ? p.reposts.length : 0) * 2 +
             (p.views || 0) * 0.1,
    }));

    scored.sort((a: any, b: any) => b.score - a.score);
    return res.json({ posts: scored.slice(0, Number(limit)) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});

// POST /api/posts - create a post
router.post('/posts', async (req, res) => {
  try {
    const { authorUsername, authorDisplayName, authorAvatar, content, type, media, music, location, reshare } = req.body;

    if (!authorUsername || !content) {
      return res.status(400).json({ error: 'authorUsername and content are required' });
    }

    const collection = await getMongoDBCollection('posts');

    const post: Post = {
      authorUsername,
      authorDisplayName: authorDisplayName || authorUsername,
      authorAvatar,
      content,
      type: type || 'text',
      media,
      likes: [],
      reposts: [],
      saves: [],
      views: 0,
      music,
      location,
      reshare: reshare || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(post);
    return res.status(201).json({ ...post, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:id/like - toggle like
router.post('/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    const collection = await getMongoDBCollection('posts');
    const post = await collection.findOne({ _id: new ObjectId(id) });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const likes: string[] = (post as any).likes || [];
    const hasLiked = likes.includes(username);

    await collection.updateOne(
      { _id: new ObjectId(id) },
      hasLiked
        ? { $pull: { likes: username } }
        : { $push: { likes: username } }
    );

    return res.json({ liked: !hasLiked, likeCount: hasLiked ? likes.length - 1 : likes.length + 1 });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// GET /api/posts/:id/comments - get comments
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = await getMongoDBCollection('comments');
    const comments = await collection
      .find({ postId: id })
      .sort({ createdAt: 1 })
      .toArray();
    return res.json({ comments });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/posts/:id/comments - add comment
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorUsername, authorDisplayName, authorAvatar, content, replyTo } = req.body;
    if (!authorUsername || !content) return res.status(400).json({ error: 'authorUsername and content required' });

    const collection = await getMongoDBCollection('comments');
    const comment: Comment = {
      postId: id,
      authorUsername,
      authorDisplayName: authorDisplayName || authorUsername,
      authorAvatar,
      content,
      likes: [],
      replyTo,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(comment);

    // Increment reply count on post
    const postsCollection = await getMongoDBCollection('posts');
    await postsCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { replyCount: 1 } });

    return res.status(201).json({ ...comment, _id: result.insertedId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/posts/:id - delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const collection = await getMongoDBCollection('posts');
    const post = await collection.findOne({ _id: new ObjectId(id) });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if ((post as any).authorUsername !== username) return res.status(403).json({ error: 'Forbidden' });
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.json({ message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
