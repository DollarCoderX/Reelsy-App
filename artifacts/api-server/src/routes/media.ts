import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Vercel: use writable storage. /tmp is available; /var/task is read-only.
const uploadDir = path.join(process.env.TMPDIR || '/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });


const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_')}`),
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/media/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = `/uploads/${file.filename}`;
    return res.status(200).json({ mediaUrl: filePath, mediaType: req.body.mediaType || 'file' });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
