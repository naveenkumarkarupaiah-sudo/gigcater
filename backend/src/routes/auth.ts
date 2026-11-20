
import { Router, Response } from 'express';
import { prisma, isDbConnected } from '../prisma';
import { signToken, authenticate, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { verifyFirebaseIdToken } from '../firebase';

const router = Router();

// Disable legacy OTP authentication
router.post('/send-otp', (_req, res) => {
  return res.status(403).json({
    error: 'OTP authentication is disabled. Please sign in with Google.',
  });
});

router.post('/verify-otp', (_req, res) => {
  return res.status(403).json({
    error: 'OTP authentication is disabled. Please sign in with Google.',
  });
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    if (!isDbConnected) {
      return res.status(503).json({
        error: 'Database service unavailable.',
      });
    }

    const { idToken, requestedRole } = req.body ?? {};

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        error: 'Valid Firebase ID token is required.',
      });
    }

    // Only allow Worker and Agent portal selection
    if (requestedRole !== 'WORKER' && requestedRole !== 'AGENT') {
      return res.status(400).json({
        error: 'Please select a valid Worker or Agent role.',
      });
    }

    const selectedRole: Role = requestedRole;

    // Verify Google authentication using Firebase Admin
    let decodedToken;

    try {
      decodedToken = await verifyFirebaseIdToken(idToken.trim());
    } catch (error: any) {
      console.error(
        '[AUTH] Firebase verification failed:',
        error.message || error
      );

      return res.status(401).json({
        error: 'Invalid or expired Google authentication token.',
      });
    }

    const { uid } = decodedToken;

    if (!uid) {
      return res.status(401).json({
        error: 'Verified Firebase user ID is missing.',
      });
    }

    // Find the existing Google user
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        workerProfile: true,
        agentProfile: true,
      },
    });

    if (!user) {
      // First-time Google login
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          phone: null,
          role: selectedRole,
        },
        include: {
          workerProfile: true,
          agentProfile: true,
        },
      });

      console.log(
        `[AUTH] Created Google user: ${user.id} (Role: ${user.role})`
      );
    } else {
      // Do not allow an Admin account to change roles
      // through the public Google login portal.
      if (user.role === 'ADMIN') {
        return res.status(403).json({
          error: 'Admin accounts cannot use Worker/Agent role switching.',
        });
      }

      // Switch the existing user's active role
      if (user.role !== selectedRole) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: selectedRole },
          include: {
            workerProfile: true,
            agentProfile: true,
          },
        });

        console.log(
          `[AUTH] Switched Google user ${user.id} to ${user.role}`
        );
      } else {
        console.log(
          `[AUTH] Returning Google user: ${user.id} (Role: ${user.role})`
        );
      }
    }

    // Generate JWT using the updated role
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
        firebaseUid: user.firebaseUid,
        hasProfile: !!(user.workerProfile || user.agentProfile),
        workerProfile: user.workerProfile || null,
        agentProfile: user.agentProfile || null,
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Google Sign-In error:', error);

    return res.status(500).json({
      error: 'Internal server error during authentication.',
    });
  }
});

// POST /api/auth/switch-role
router.post(
  '/switch-role',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!isDbConnected) {
        return res.status(503).json({
          error: 'Database service unavailable.',
        });
      }

      const { role } = req.body ?? {};

      if (role !== 'WORKER' && role !== 'AGENT') {
        return res.status(400).json({
          error: 'Invalid role selection.',
        });
      }

      const userId = req.user!.id;

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          workerProfile: true,
          agentProfile: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({
          error: 'User account not found.',
        });
      }

      // Never switch an Admin through this public endpoint
      if (currentUser.role === 'ADMIN') {
        return res.status(403).json({
          error: 'Admin accounts cannot switch through this endpoint.',
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        include: {
          workerProfile: true,
          agentProfile: true,
        },
      });

      const token = signToken({
        id: updatedUser.id,
        phone: updatedUser.phone,
        role: updatedUser.role,
      });

      return res.json({
        message: `Active mode switched to ${role}`,
        token,
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          role: updatedUser.role,
          activeMode: role,
          firebaseUid: updatedUser.firebaseUid,
          hasProfile: !!(
            updatedUser.workerProfile || updatedUser.agentProfile
          ),
          workerProfile: updatedUser.workerProfile || null,
          agentProfile: updatedUser.agentProfile || null,
        },
      });
    } catch (error: any) {
      console.error('[AUTH] Role switch error:', error);

      return res.status(500).json({
        error: 'Failed to switch user mode.',
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated.',
      });
    }

    if (!isDbConnected) {
      return res.status(503).json({
        error: 'Database service unavailable.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        workerProfile: true,
        agentProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    return res.json({
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        firebaseUid: user.firebaseUid,
        hasProfile: !!(user.workerProfile || user.agentProfile),
        workerProfile: user.workerProfile || null,
        agentProfile: user.agentProfile || null,
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Fetch user error:', error);

    return res.status(500).json({
      error: 'Failed to retrieve user details.',
    });
  }
});

export default router;
