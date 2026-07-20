import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabaseClient } from '../lib/supabase';

const router = Router();

// Use memory storage so we can stream directly to Supabase Storage
// Increase limit to 100 MB to support documents and larger videos
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const BUCKET = 'media';

async function ensureBucket() {
  try {
    const client = getSupabaseClient();
    // Create bucket without MIME restrictions so any file type is accepted
    const { error } = await client.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 104857600, // 100 MB
    });
    if (error && error.message !== 'The resource already exists') {
      console.warn('Could not create storage bucket:', error.message);
    }
  } catch {}
}

// Try to create bucket on startup (non-fatal)
ensureBucket();

router.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = (file.originalname.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const client = getSupabaseClient();
    const { error } = await client.storage.from(BUCKET).upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({ error: 'Upload to storage failed' });
    }

    const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(filename);

    // Determine media type for the client
    let mediaType: 'image' | 'video' | 'audio' | 'document';
    if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
    else if (file.mimetype.startsWith('image/')) mediaType = 'image';
    else mediaType = 'document';

    return res.status(200).json({ mediaUrl: publicUrl, mediaType, originalName: file.originalname, size: file.size });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
