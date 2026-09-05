import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { STORAGE_ROOT } from './upload';

const router = Router();

// GET /api/profile
router.get('/', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    let profile: any;

    if (isDbConnected) {
      profile = await prisma.workerProfile.findUnique({
        where: { userId: req.user!.id },
      });
    } else {
      profile = memoryDb.workerProfiles.find(p => p.userId === req.user!.id);
    }

    if (!profile) {
      return res.status(404).json({ error: 'Worker profile not found.' });
    }

    return res.json({ profile });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// POST /api/profile
router.post('/', authenticate, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
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

    let profile: any;

    if (isDbConnected) {
      profile = await prisma.workerProfile.upsert({
        where: { userId: req.user!.id },
        update: {
          name: name.trim(),
          age: parsedAge,
          contactPhone: contactPhone.trim(),
          profilePhotoKey: profilePhotoKey || undefined,
          idProofKey: idProofKey || undefined,
          gpayNumber: String(gpayNumber).trim(),
        },
        create: {
          userId: req.user!.id,
          name: name.trim(),
          age: parsedAge,
          contactPhone: contactPhone.trim(),
          profilePhotoKey: profilePhotoKey || null,
          idProofKey: idProofKey || null,
          gpayNumber: String(gpayNumber).trim(),
        },
      });
    } else {
      let existingIndex = memoryDb.workerProfiles.findIndex(p => p.userId === req.user!.id);
      if (existingIndex >= 0) {
        memoryDb.workerProfiles[existingIndex] = {
          ...memoryDb.workerProfiles[existingIndex],
          name: name.trim(),
          age: parsedAge,
          contactPhone: contactPhone.trim(),
          profilePhotoKey: profilePhotoKey || memoryDb.workerProfiles[existingIndex].profilePhotoKey,
          idProofKey: idProofKey || memoryDb.workerProfiles[existingIndex].idProofKey,
          gpayNumber: String(gpayNumber).trim(),
          updatedAt: new Date(),
        };
        profile = memoryDb.workerProfiles[existingIndex];
      } else {
        profile = {
          id: `prof_${Date.now()}`,
          userId: req.user!.id,
          name: name.trim(),
          age: parsedAge,
          contactPhone: contactPhone.trim(),
          profilePhotoKey: profilePhotoKey || null,
          idProofKey: idProofKey || null,
          gpayNumber: String(gpayNumber).trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryDb.workerProfiles.push(profile);
      }

      // Update user reference in memory DB
      const user = memoryDb.users.find(u => u.id === req.user!.id);
      if (user) user.workerProfile = profile;
    }

    return res.json({ message: 'Profile saved successfully', profile });
  } catch (error) {
    console.error('Error saving profile:', error);
    return res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// GET /api/profile/agent
router.get('/agent', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    let profile: any;

    if (isDbConnected) {
      profile = await prisma.agentProfile.findUnique({
        where: { userId: req.user!.id },
      });
    } else {
      profile = memoryDb.agentProfiles.find(p => p.userId === req.user!.id);
    }

    if (!profile) {
      return res.status(404).json({ error: 'Agent profile not found.' });
    }

    return res.json({ profile });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch agent profile.' });
  }
});

// POST /api/profile/agent
router.post('/agent', authenticate, requireRole(['AGENT']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, photos, whatsappNumber, originalProofDoc } = req.body;

    if (!name || !phone || !whatsappNumber) {
      return res.status(400).json({ error: 'Agent Name, Phone Number, and WhatsApp Number are required.' });
    }

    if (!photos) {
      return res.status(400).json({ error: 'A confirmed Profile/Face Photo is required before you can save your Agent profile.' });
    }

    let profile: any;

    if (isDbConnected) {
      profile = await prisma.agentProfile.upsert({
        where: { userId: req.user!.id },
        update: {
          name: name.trim(),
          phone: phone.trim(),
          photos: photos || undefined,
          whatsappNumber: whatsappNumber.trim(),
          originalProofDoc: originalProofDoc || undefined,
          verificationStatus: 'VERIFIED',
        },
        create: {
          userId: req.user!.id,
          name: name.trim(),
          phone: phone.trim(),
          photos: photos || null,
          whatsappNumber: whatsappNumber.trim(),
          originalProofDoc: originalProofDoc || null,
          verificationStatus: 'VERIFIED',
        },
      });
    } else {
      let existingIndex = memoryDb.agentProfiles.findIndex(p => p.userId === req.user!.id);
      if (existingIndex >= 0) {
        memoryDb.agentProfiles[existingIndex] = {
          ...memoryDb.agentProfiles[existingIndex],
          name: name.trim(),
          phone: phone.trim(),
          photos: photos || memoryDb.agentProfiles[existingIndex].photos,
          whatsappNumber: whatsappNumber.trim(),
          originalProofDoc: originalProofDoc || memoryDb.agentProfiles[existingIndex].originalProofDoc,
          verificationStatus: 'VERIFIED',
          updatedAt: new Date(),
        };
        profile = memoryDb.agentProfiles[existingIndex];
      } else {
        profile = {
          id: `ag_prof_${Date.now()}`,
          userId: req.user!.id,
          name: name.trim(),
          phone: phone.trim(),
          photos: photos || null,
          whatsappNumber: whatsappNumber.trim(),
          originalProofDoc: originalProofDoc || null,
          verificationStatus: 'VERIFIED',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryDb.agentProfiles.push(profile);
      }

      const user = memoryDb.users.find(u => u.id === req.user!.id);
      if (user) user.agentProfile = profile;
    }

    return res.json({ message: 'Agent Profile saved successfully', profile });
  } catch (error) {
    console.error('Error saving agent profile:', error);
    return res.status(500).json({ error: 'Failed to save agent profile.' });
  }
});

// GET /api/profile/id-proof/:role/:userId
// Securely streams a user's ID proof document. Only the document's owner, or an ADMIN
// (e.g. investigating a payment complaint), may view it — this must never be reachable publicly.
router.get('/id-proof/:role/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.params;
    if (role !== 'worker' && role !== 'agent') {
      return res.status(400).json({ error: 'Invalid role. Must be "worker" or "agent".' });
    }

    const isOwner = req.user!.id === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: you are not authorized to view this ID proof document.' });
    }

    let idProofKey: string | null | undefined;
    if (isDbConnected) {
      if (role === 'worker') {
        idProofKey = (await prisma.workerProfile.findUnique({ where: { userId } }))?.idProofKey;
      } else {
        idProofKey = (await prisma.agentProfile.findUnique({ where: { userId } }))?.originalProofDoc;
      }
    } else {
      if (role === 'worker') {
        idProofKey = memoryDb.workerProfiles.find(p => p.userId === userId)?.idProofKey;
      } else {
        idProofKey = memoryDb.agentProfiles.find(p => p.userId === userId)?.originalProofDoc;
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
    const safeKey = idProofKey.split('/').filter((s: string) => s && s !== '..').join('/');
    const filePath = path.join(STORAGE_ROOT, safeKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ID proof file not found in storage.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error retrieving ID proof:', error);
    return res.status(500).json({ error: 'Failed to retrieve ID proof document.' });
  }
});

export default router;
