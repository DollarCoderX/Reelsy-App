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

// GET /api/posts - get feed posts
router.get('/posts', async (req, res) => {
  try {
    const { limit = 20, skip = 0, username } = req.query;
    const collection = await getMongoDBCollection('posts');

    const query: any = {};
    if (username) query.authorUsername = username;

    const posts = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray();

    return res.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts - create a post
router.post('/posts', async (req, res) => {
  try {
    const { authorUsername, authorDisplayName, authorAvatar, content, type, media, music, location } = req.body;

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
