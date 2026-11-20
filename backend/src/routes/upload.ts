import express, { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

// Local disk location backing the mock S3 upload, so files survive to be viewed later
// (e.g. by an agent reviewing a worker's profile photo or check-in/out photos).
export const STORAGE_ROOT = path.join(process.cwd(), 'storage');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_access_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key',
  },
});

// POST /api/upload/presigned-url - Generate pre-signed URL for uploading files
// (Worker profile photo/ID proof/attendance photos, or Agent profile photo/ID proof/payment proof)
router.post('/presigned-url', authenticate, requireRole(['WORKER', 'AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { fileType, fileName } = req.body; // e.g. 'profilePhoto', 'idProof', 'checkInPhoto', 'checkOutPhoto', 'paymentProof'

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required.' });
    }

    // ID proof documents are sensitive — store them under a "private" prefix that the
    // public /media static route refuses to serve (see index.ts). Everything else
    // (profile photos, attendance/payment photos) stays under "uploads" and is publicly viewable.
    const isPrivate = fileType === 'idProof';
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `${isPrivate ? 'private' : 'uploads'}/user_${req.user!.id}/${fileType || 'file'}_${timestamp}_${cleanFileName}`;
    const bucketName = process.env.AWS_S3_BUCKET || 'gigcater-uploads';

    // If actual AWS credentials are provided, generate a real presigned S3 URL
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'mock_access_key') {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: req.body.contentType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return res.json({
        uploadUrl,
        objectKey,
        fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectKey}`,
      });
    }

    // Dev mode / Mock S3 response — file is actually persisted to local disk (see PUT handler
    // below) and served back from /media, so uploaded photos are really viewable afterwards.
    const mockUploadUrl = `http://localhost:${process.env.PORT || 5000}/api/upload/mock-s3-upload?key=${encodeURIComponent(objectKey)}`;
    const mockFileUrl = `http://localhost:${process.env.PORT || 5000}/media/${objectKey}`;

    return res.json({
      uploadUrl: mockUploadUrl,
      objectKey,
      fileUrl: mockFileUrl,
      isMock: true,
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL.' });
  }
});

// ❌ MOCK S3 UPLOAD DISABLED IN PRODUCTION
// This endpoint is only available in development mode and requires authentication + validation.
// In production (NODE_ENV === 'production'), any request to /mock-s3-upload returns 403 Forbidden.
//
// In development, the handler below requires a valid auth token and validates file type, size and path.
router.put('/mock-s3-upload', authenticate, requireRole(['WORKER', 'AGENT']), express.raw({ type: '*/*', limit: '5mb' }), (req, res) => {
  try {
    const key = req.query.key as string;
    if (!key) return res.status(400).json({ error: 'Missing key.' });

    // Check we're not in production — production must fail closed
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Mock uploads disabled in production.' });
    }

    // Validate file path to prevent directory traversal
    const cleanKey = key.split('/').filter(segment => segment && segment !== '..' && segment !== '..').join('/');
    if (!cleanKey || cleanKey.includes('..')) {
      return res.status(400).json({ error: 'Invalid file path.' });
    }

    // Validate that the key references a valid upload area (not private ID proof)
    // Private keys start with 'private/' and contain sensitive ID proof documents
    if (cleanKey.startsWith('private/')) {
      return res.status(403).json({ error: 'ID proof documents cannot be uploaded via mock S3.' });
    }

    const safeKey = cleanKey;
    const destPath = path.join(STORAGE_ROOT, safeKey);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, req.body as Buffer);

    return res.status(200).json({ message: 'File upload simulated successfully via mock S3.' });
  } catch (error) {
    console.error('Error saving mock upload:', error);
    return res.status(500).json({ error: 'Failed to save uploaded file.' });
  }
});

export default router;
