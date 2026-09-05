"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const upload_1 = require("./upload");
const router = (0, express_1.Router)();
// GET /api/profile
router.get('/', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER']), async (req, res) => {
    try {
        let profile;
        if (prisma_1.isDbConnected) {
            profile = await prisma_1.prisma.workerProfile.findUnique({
                where: { userId: req.user.id },
            });
        }
        else {
            profile = prisma_1.memoryDb.workerProfiles.find(p => p.userId === req.user.id);
        }
        if (!profile) {
            return res.status(404).json({ error: 'Worker profile not found.' });
        }
        return res.json({ profile });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});
// POST /api/profile
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['WORKER']), async (req, res) => {
    try {
        const { name, age, contactPhone, profilePhotoKey, idProofKey, gpayNumber } = req.body;
        if (!name || !age || !contactPhone) {
            return res.status(400).json({ error: 'Name, age, and contact phone are required.' });
        }
        if (!profilePhotoKey || !idProofKey) {
            return res.status(400).json({ error: 'A profile photo and ID proof upload are both required to create your worker profile.' });
        }
        if (!gpayNumber || !String(gpayNumber).trim()) {
            return res.status(400).json({ error: 'A UPI/GPay number is required so agents can pay you for completed gigs.' });
        }
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 100) {
            return res.status(400).json({ error: 'Age must be a valid number between 18 and 100.' });
        }
        let profile;
        if (prisma_1.isDbConnected) {
            profile = await prisma_1.prisma.workerProfile.upsert({
                where: { userId: req.user.id },
                update: {
                    name: name.trim(),
                    age: parsedAge,
                    contactPhone: contactPhone.trim(),
                    profilePhotoKey: profilePhotoKey || undefined,
                    idProofKey: idProofKey || undefined,
                    gpayNumber: String(gpayNumber).trim(),
                },
                create: {
                    userId: req.user.id,
                    name: name.trim(),
                    age: parsedAge,
                    contactPhone: contactPhone.trim(),
                    profilePhotoKey: profilePhotoKey || null,
                    idProofKey: idProofKey || null,
                    gpayNumber: String(gpayNumber).trim(),
                },
            });
        }
        else {
            let existingIndex = prisma_1.memoryDb.workerProfiles.findIndex(p => p.userId === req.user.id);
            if (existingIndex >= 0) {
                prisma_1.memoryDb.workerProfiles[existingIndex] = {
                    ...prisma_1.memoryDb.workerProfiles[existingIndex],
                    name: name.trim(),
                    age: parsedAge,
                    contactPhone: contactPhone.trim(),
                    profilePhotoKey: profilePhotoKey || prisma_1.memoryDb.workerProfiles[existingIndex].profilePhotoKey,
                    idProofKey: idProofKey || prisma_1.memoryDb.workerProfiles[existingIndex].idProofKey,
                    gpayNumber: String(gpayNumber).trim(),
                    updatedAt: new Date(),
                };
                profile = prisma_1.memoryDb.workerProfiles[existingIndex];
            }
            else {
                profile = {
                    id: `prof_${Date.now()}`,
                    userId: req.user.id,
                    name: name.trim(),
                    age: parsedAge,
                    contactPhone: contactPhone.trim(),
                    profilePhotoKey: profilePhotoKey || null,
                    idProofKey: idProofKey || null,
                    gpayNumber: String(gpayNumber).trim(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                prisma_1.memoryDb.workerProfiles.push(profile);
            }
            // Update user reference in memory DB
            const user = prisma_1.memoryDb.users.find(u => u.id === req.user.id);
            if (user)
                user.workerProfile = profile;
        }
        return res.json({ message: 'Profile saved successfully', profile });
    }
    catch (error) {
        console.error('Error saving profile:', error);
        return res.status(500).json({ error: 'Failed to save profile.' });
    }
});
// GET /api/profile/agent
router.get('/agent', auth_1.authenticate, (0, auth_1.requireRole)(['AGENT']), async (req, res) => {
    try {
        let profile;
        if (prisma_1.isDbConnected) {
            profile = await prisma_1.prisma.agentProfile.findUnique({
                where: { userId: req.user.id },
            });
        }
        else {
            profile = prisma_1.memoryDb.agentProfiles.find(p => p.userId === req.user.id);
        }
        if (!profile) {
            return res.status(404).json({ error: 'Agent profile not found.' });
        }
        return res.json({ profile });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch agent profile.' });
    }
});
// POST /api/profile/agent
router.post('/agent', auth_1.authenticate, (0, auth_1.requireRole)(['AGENT']), async (req, res) => {
    try {
        const { name, phone, photos, whatsappNumber, originalProofDoc } = req.body;
        if (!name || !phone || !whatsappNumber) {
            return res.status(400).json({ error: 'Agent Name, Phone Number, and WhatsApp Number are required.' });
        }
        if (!photos) {
            return res.status(400).json({ error: 'A confirmed Profile/Face Photo is required before you can save your Agent profile.' });
        }
        let profile;
        if (prisma_1.isDbConnected) {
            profile = await prisma_1.prisma.agentProfile.upsert({
                where: { userId: req.user.id },
                update: {
                    name: name.trim(),
                    phone: phone.trim(),
                    photos: photos || undefined,
                    whatsappNumber: whatsappNumber.trim(),
                    originalProofDoc: originalProofDoc || undefined,
                    verificationStatus: 'VERIFIED',
                },
                create: {
                    userId: req.user.id,
                    name: name.trim(),
                    phone: phone.trim(),
                    photos: photos || null,
                    whatsappNumber: whatsappNumber.trim(),
                    originalProofDoc: originalProofDoc || null,
                    verificationStatus: 'VERIFIED',
                },
            });
        }
        else {
            let existingIndex = prisma_1.memoryDb.agentProfiles.findIndex(p => p.userId === req.user.id);
            if (existingIndex >= 0) {
                prisma_1.memoryDb.agentProfiles[existingIndex] = {
                    ...prisma_1.memoryDb.agentProfiles[existingIndex],
                    name: name.trim(),
                    phone: phone.trim(),
                    photos: photos || prisma_1.memoryDb.agentProfiles[existingIndex].photos,
                    whatsappNumber: whatsappNumber.trim(),
                    originalProofDoc: originalProofDoc || prisma_1.memoryDb.agentProfiles[existingIndex].originalProofDoc,
                    verificationStatus: 'VERIFIED',
                    updatedAt: new Date(),
                };
                profile = prisma_1.memoryDb.agentProfiles[existingIndex];
            }
            else {
                profile = {
                    id: `ag_prof_${Date.now()}`,
                    userId: req.user.id,
                    name: name.trim(),
                    phone: phone.trim(),
                    photos: photos || null,
                    whatsappNumber: whatsappNumber.trim(),
                    originalProofDoc: originalProofDoc || null,
                    verificationStatus: 'VERIFIED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                prisma_1.memoryDb.agentProfiles.push(profile);
            }
            const user = prisma_1.memoryDb.users.find(u => u.id === req.user.id);
            if (user)
                user.agentProfile = profile;
        }
        return res.json({ message: 'Agent Profile saved successfully', profile });
    }
    catch (error) {
        console.error('Error saving agent profile:', error);
        return res.status(500).json({ error: 'Failed to save agent profile.' });
    }
});
// GET /api/profile/id-proof/:role/:userId
// Securely streams a user's ID proof document. Only the document's owner, or an ADMIN
// (e.g. investigating a payment complaint), may view it — this must never be reachable publicly.
router.get('/id-proof/:role/:userId', auth_1.authenticate, async (req, res) => {
    try {
        const { role, userId } = req.params;
        if (role !== 'worker' && role !== 'agent') {
            return res.status(400).json({ error: 'Invalid role. Must be "worker" or "agent".' });
        }
        const isOwner = req.user.id === userId;
        const isAdmin = req.user.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden: you are not authorized to view this ID proof document.' });
        }
        let idProofKey;
        if (prisma_1.isDbConnected) {
            if (role === 'worker') {
                idProofKey = (await prisma_1.prisma.workerProfile.findUnique({ where: { userId } }))?.idProofKey;
            }
            else {
                idProofKey = (await prisma_1.prisma.agentProfile.findUnique({ where: { userId } }))?.originalProofDoc;
            }
        }
        else {
            if (role === 'worker') {
                idProofKey = prisma_1.memoryDb.workerProfiles.find(p => p.userId === userId)?.idProofKey;
            }
            else {
                idProofKey = prisma_1.memoryDb.agentProfiles.find(p => p.userId === userId)?.originalProofDoc;
            }
        }
        if (!idProofKey) {
            return res.status(404).json({ error: 'No ID proof document found for this user.' });
        }
        // Real S3 mode: the stored value is already a full URL — hand back a redirect.
        if (idProofKey.startsWith('http://') || idProofKey.startsWith('https://')) {
            return res.redirect(idProofKey);
        }
        // Local/mock storage mode: stream the file straight from disk.
        const safeKey = idProofKey.split('/').filter((s) => s && s !== '..').join('/');
        const filePath = path_1.default.join(upload_1.STORAGE_ROOT, safeKey);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'ID proof file not found in storage.' });
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.sendFile(filePath);
    }
    catch (error) {
        console.error('Error retrieving ID proof:', error);
        return res.status(500).json({ error: 'Failed to retrieve ID proof document.' });
    }
});
exports.default = router;
