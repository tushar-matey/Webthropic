import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import type { SanitizedUser } from '../types/user.types.js';

/**
 * Middleware to require user authentication on protected routes
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session?.userId || (req.user as any)?.id || (req.user as any)?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
      return;
    }

    // Attach user to req.user if not already populated
    if (!req.user) {
      const user = await authService.getUserById(userId.toString());
      if (!user) {
        // Destroy invalid session
        req.session.destroy(() => {});
        res.status(401).json({
          success: false,
          message: 'User account not found. Please log in again.'
        });
        return;
      }
      req.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to optionally attach authenticated user without blocking
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session?.userId || (req.user as any)?.id || (req.user as any)?._id;

    if (userId && !req.user) {
      const user = await authService.getUserById(userId.toString());
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch {
    next();
  }
}
