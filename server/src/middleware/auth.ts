import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { AuthUser, UserRole } from '../types';
import { logger } from '../utils/logger';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies Firebase ID token from Authorization header.
 * Falls through with demo user if Firebase is not configured.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // Demo mode: allow unauthenticated access
    const auth = getAuth();
    if (!auth) {
      req.user = { uid: 'demo-user', email: 'demo@astraflow.x', role: 'attendee' };
      next();
      return;
    }

    res.status(401).json({ success: false, error: 'Missing authorization header', timestamp: Date.now() });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const auth = getAuth();
    if (!auth) {
      req.user = { uid: 'demo-user', email: 'demo@astraflow.x', role: 'attendee' };
      next();
      return;
    }

    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role: (decoded.role as UserRole) ?? 'attendee',
    };
    next();
  } catch (error) {
    logger.error('Auth verification failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(401).json({ success: false, error: 'Invalid token', timestamp: Date.now() });
  }
}

/**
 * Ensures the user has the required role.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated', timestamp: Date.now() });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions', timestamp: Date.now() });
      return;
    }

    next();
  };
}
