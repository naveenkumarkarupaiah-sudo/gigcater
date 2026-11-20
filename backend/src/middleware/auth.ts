import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma, isDbConnected } from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone?: string | null;
    role: Role;
    firebaseUid?: string | null;
  };
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or empty. Please set JWT_SECRET in your environment.');
  }
  return secret.trim();
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; phone?: string | null; role: Role };

    if (!isDbConnected) {
      return res.status(503).json({
        error: 'Database service unavailable. Persistent database connection is required for authentication.',
      });
    }

    // Authoritative check against current PostgreSQL database record
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, role: true, firebaseUid: true },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User account no longer exists or session has been invalidated.' });
    }

    req.user = {
      id: dbUser.id,
      phone: dbUser.phone,
      role: dbUser.role,
      firebaseUid: dbUser.firebaseUid,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access forbidden. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

export const signToken = (payload: { id: string; phone?: string | null; role: Role }) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
};
