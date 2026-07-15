import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabaseClient } from '../lib/supabase';

const router = Router();

// Use memory storage so we can stream directly to Supabase Storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const BUCKET = 'media';

async function ensureBucket() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ['image/*', 'video/*', 'audio/*'],
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
    const mediaType = file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'audio' : 'image';

    return res.status(200).json({ mediaUrl: publicUrl, mediaType });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
