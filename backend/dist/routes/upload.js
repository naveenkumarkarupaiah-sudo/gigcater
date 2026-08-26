"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const router = (0, express_1.Router)();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_access_key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key',
    },
});
// POST /api/upload/presigned-url - Generate pre-signed URL for uploading files (Profile Photo or ID Proof)
router.post('/presigned-url', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER']), async (req, res) => {
    try {
        const { fileType, fileName } = req.body; // 'profilePhoto' or 'idProof'
        if (!fileName) {
            return res.status(400).json({ error: 'fileName is required.' });
        }
        const timestamp = Date.now();
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const objectKey = `uploads/user_${req.user.id}/${fileType || 'file'}_${timestamp}_${cleanFileName}`;
        const bucketName = process.env.AWS_S3_BUCKET || 'gigcater-uploads';
        // If actual AWS credentials are provided, generate a real presigned S3 URL
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'mock_access_key') {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                ContentType: req.body.contentType || 'application/octet-stream',
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 });
            return res.json({
                uploadUrl,
                objectKey,
                fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectKey}`,
            });
        }
        // Dev mode / Mock S3 response
        const mockUploadUrl = `http://localhost:${process.env.PORT || 5000}/api/upload/mock-s3-upload?key=${encodeURIComponent(objectKey)}`;
        const mockFileUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(fileType || 'UploadedFile')}`;
        return res.json({
            uploadUrl: mockUploadUrl,
            objectKey,
            fileUrl: mockFileUrl,
            isMock: true,
        });
    }
    catch (error) {
        console.error('Error generating pre-signed URL:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL.' });
    }
});
// Mock S3 PUT endpoint for development testing
router.put('/mock-s3-upload', (req, res) => {
    return res.status(200).json({ message: 'File upload simulated successfully via mock S3.' });
});
exports.default = router;
