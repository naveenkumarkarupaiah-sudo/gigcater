import { Router, Response } from 'express';
import { prisma, isDbConnected, memoryDb } from '../prisma';
import { signToken, authenticate, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpStore: Record<string, string> = {};

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Valid phone number is required.' });
  }

  const cleanPhone = phone.trim();
  const code = '123456';
  otpStore[cleanPhone] = code;

  console.log(`[AUTH] OTP sent to ${cleanPhone}: ${code}`);

  return res.json({
    message: 'OTP sent successfully',
    phone: cleanPhone,
    testCode: code,
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, code, role } = req.body;

  if (!phone || !code || !role) {
    return res.status(400).json({ error: 'Phone, OTP code, and role (AGENT or WORKER) are required.' });
  }

  if (role !== 'AGENT' && role !== 'WORKER') {
    return res.status(400).json({ error: 'Invalid role. Must be AGENT or WORKER.' });
  }

  const cleanPhone = (phone as string).trim();
  const storedCode = otpStore[cleanPhone] || '123456';

  if (code !== storedCode && code !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP code.' });
  }

  delete otpStore[cleanPhone];

  let user: any;

  if (isDbConnected) {
    user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: { workerProfile: true, agentProfile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          role: role as Role,
        },
        include: { workerProfile: true, agentProfile: true },
      });
    } else if (user.role !== role) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: role as Role },
        include: { workerProfile: true, agentProfile: true },
      });
    }
  } else {
    // Memory DB Fallback
    user = memoryDb.users.find(u => u.phone === cleanPhone);
    if (!user) {
      const workerProf = memoryDb.workerProfiles.find(p => p.contactPhone === cleanPhone);
      const agentProf = memoryDb.agentProfiles.find(p => p.userId === `usr_${cleanPhone}`);
      user = {
        id: `usr_${cleanPhone.replace(/[^0-9]/g, '')}`,
        phone: cleanPhone,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        workerProfile: workerProf || null,
        agentProfile: agentProf || null,
      };
      memoryDb.users.push(user);
    } else {
      user.role = role;
      const agentProf = memoryDb.agentProfiles.find(p => p.userId === user.id);
      user.agentProfile = agentProf || user.agentProfile || null;
    }
  }

  const token = signToken({
    id: user.id,
    phone: user.phone,
    role: user.role,
  });

  return res.json({
    message: 'Authentication successful',
    token,
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      hasProfile: !!(user.workerProfile || user.agentProfile),
      workerProfile: user.workerProfile || null,
      agentProfile: user.agentProfile || null,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  let user: any;
  if (isDbConnected) {
    user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { workerProfile: true, agentProfile: true },
    });
  } else {
    user = memoryDb.users.find(u => u.id === req.user!.id);
    if (user) {
      const workerProf = memoryDb.workerProfiles.find(p => p.userId === user.id);
      const agentProf = memoryDb.agentProfiles.find(p => p.userId === user.id);
      user.workerProfile = workerProf || null;
      user.agentProfile = agentProf || null;
    }
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      hasProfile: !!(user.workerProfile || user.agentProfile),
      workerProfile: user.workerProfile || null,
      agentProfile: user.agentProfile || null,
    },
  });
});

export default router;
