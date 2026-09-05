"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_ROOT = void 0;
const express_1 = __importStar(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const router = (0, express_1.Router)();
// Local disk location backing the mock S3 upload, so files survive to be viewed later
// (e.g. by an agent reviewing a worker's profile photo or check-in/out photos).
exports.STORAGE_ROOT = path_1.default.join(process.cwd(), 'storage');
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_access_key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key',
    },
});
// POST /api/upload/presigned-url - Generate pre-signed URL for uploading files
// (Worker profile photo/ID proof/attendance photos, or Agent profile photo/ID proof/payment proof)
router.post('/presigned-url', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER', 'AGENT']), async (req, res) => {
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
        const objectKey = `${isPrivate ? 'private' : 'uploads'}/user_${req.user.id}/${fileType || 'file'}_${timestamp}_${cleanFileName}`;
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
    }
    catch (error) {
        console.error('Error generating pre-signed URL:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL.' });
    }
});
// Mock S3 PUT endpoint for development testing — persists the raw bytes to local disk
// under STORAGE_ROOT so they can actually be served back (see /media static route in index.ts).
router.put('/mock-s3-upload', express_1.default.raw({ type: '*/*', limit: '15mb' }), (req, res) => {
    try {
        const key = req.query.key;
        if (!key)
            return res.status(400).json({ error: 'Missing key.' });
        // Object keys are server-generated, but strip any traversal segments defensively.
        const safeKey = key.split('/').filter(segment => segment && segment !== '..').join('/');
        const destPath = path_1.default.join(exports.STORAGE_ROOT, safeKey);
        fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
        fs_1.default.writeFileSync(destPath, req.body);
        return res.status(200).json({ message: 'File upload simulated successfully via mock S3.' });
    }
    catch (error) {
        console.error('Error saving mock upload:', error);
        return res.status(500).json({ error: 'Failed to save uploaded file.' });
    }
});
exports.default = router;
