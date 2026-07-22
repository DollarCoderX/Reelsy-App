import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getDb } from '../lib/mongodb';

const router = Router();

// 100 MB limit; memory storage so we can pipe directly into GridFS
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db as any, { bucketName: 'media' });
}

/**
 * POST /api/media/upload
 * Accepts a multipart file, stores it in MongoDB GridFS, and returns a
 * relative URL (/api/media/:id) that the frontend can use directly.
 * This avoids any dependency on Supabase Storage.
 */
router.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = (file.originalname.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const bucket = await getBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Pipe buffer into GridFS
    const readable = Readable.from(file.buffer);
    await new Promise<void>((resolve, reject) => {
      readable.pipe(uploadStream);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    const fileId = (uploadStream.id as ObjectId).toString();
    const mediaUrl = `/api/media/${fileId}`;

    let mediaType: 'image' | 'video' | 'audio' | 'document';
    if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
    else if (file.mimetype.startsWith('image/')) mediaType = 'image';
    else mediaType = 'document';

    return res.status(200).json({
      mediaUrl,
      mediaType,
      originalName: file.originalname,
      size: file.size,
    });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * GET /api/media/:id
 * Streams the stored file from MongoDB GridFS to the client.
 */
router.get('/media/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket = await getBucket();
    const objectId = new ObjectId(id);
    const files = await bucket.find({ _id: objectId }).toArray();

    if (!files.length) return res.status(404).json({ error: 'File not found' });

    const file = files[0];
    const contentType = (file as any).metadata?.contentType || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if ((file as any).metadata?.originalName) {
      res.setHeader('Content-Disposition', `inline; filename="${(file as any).metadata.originalName}"`);
    }

    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Media serve error', err);
    if (!res.headersSent) return res.status(500).json({ error: 'Failed to serve file' });
  }
});

export default router;
