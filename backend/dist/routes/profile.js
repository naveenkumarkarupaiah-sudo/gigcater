"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
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
        const { name, age, contactPhone, profilePhotoKey, idProofKey } = req.body;
        if (!name || !age || !contactPhone) {
            return res.status(400).json({ error: 'Name, age, and contact phone are required.' });
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
                },
                create: {
                    userId: req.user.id,
                    name: name.trim(),
                    age: parsedAge,
                    contactPhone: contactPhone.trim(),
                    profilePhotoKey: profilePhotoKey || null,
                    idProofKey: idProofKey || null,
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
exports.default = router;
