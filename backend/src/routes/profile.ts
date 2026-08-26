import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

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
    const { name, age, contactPhone, profilePhotoKey, idProofKey } = req.body;

    if (!name || !age || !contactPhone) {
      return res.status(400).json({ error: 'Name, age, and contact phone are required.' });
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
        },
        create: {
          userId: req.user!.id,
          name: name.trim(),
          age: parsedAge,
          contactPhone: contactPhone.trim(),
          profilePhotoKey: profilePhotoKey || null,
          idProofKey: idProofKey || null,
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
    const { agencyName, businessLicense, contactEmail, officeAddress, licenseDocKey } = req.body;

    if (!agencyName || !businessLicense || !contactEmail || !officeAddress) {
      return res.status(400).json({ error: 'Agency name, business license number, contact email, and office address are required.' });
    }

    let profile: any;

    if (isDbConnected) {
      profile = await prisma.agentProfile.upsert({
        where: { userId: req.user!.id },
        update: {
          agencyName: agencyName.trim(),
          businessLicense: businessLicense.trim(),
          contactEmail: contactEmail.trim(),
          officeAddress: officeAddress.trim(),
          verificationStatus: 'VERIFIED',
          licenseDocKey: licenseDocKey || undefined,
        },
        create: {
          userId: req.user!.id,
          agencyName: agencyName.trim(),
          businessLicense: businessLicense.trim(),
          contactEmail: contactEmail.trim(),
          officeAddress: officeAddress.trim(),
          verificationStatus: 'VERIFIED',
          licenseDocKey: licenseDocKey || null,
        },
      });
    } else {
      let existingIndex = memoryDb.agentProfiles.findIndex(p => p.userId === req.user!.id);
      if (existingIndex >= 0) {
        memoryDb.agentProfiles[existingIndex] = {
          ...memoryDb.agentProfiles[existingIndex],
          agencyName: agencyName.trim(),
          businessLicense: businessLicense.trim(),
          contactEmail: contactEmail.trim(),
          officeAddress: officeAddress.trim(),
          verificationStatus: 'VERIFIED',
          licenseDocKey: licenseDocKey || memoryDb.agentProfiles[existingIndex].licenseDocKey,
          updatedAt: new Date(),
        };
        profile = memoryDb.agentProfiles[existingIndex];
      } else {
        profile = {
          id: `ag_prof_${Date.now()}`,
          userId: req.user!.id,
          agencyName: agencyName.trim(),
          businessLicense: businessLicense.trim(),
          contactEmail: contactEmail.trim(),
          officeAddress: officeAddress.trim(),
          verificationStatus: 'VERIFIED',
          licenseDocKey: licenseDocKey || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryDb.agentProfiles.push(profile);
      }

      const user = memoryDb.users.find(u => u.id === req.user!.id);
      if (user) user.agentProfile = profile;
    }

    return res.json({ message: 'Agency profile verified and saved successfully', profile });
  } catch (error) {
    console.error('Error saving agent profile:', error);
    return res.status(500).json({ error: 'Failed to save agency profile.' });
  }
});

export default router;
