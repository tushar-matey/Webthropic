import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);

      // Establish authenticated session upon registration
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await authService.login(email, password);

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            user
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('webthropic.sid', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
        res.status(200).json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.session?.userId || (req.user as any)?.id;

      if (!userId) {
        res.status(200).json({
          authenticated: false,
          user: null
        });
        return;
      }

      const user = await authService.getUserById(userId.toString());
      if (!user) {
        req.session.destroy(() => {});
        res.status(200).json({
          authenticated: false,
          user: null
        });
        return;
      }

      res.status(200).json({
        authenticated: true,
        user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      const user = await authService.resetPassword(token, password);

      // Invalidate existing session and start fresh
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.status(200).json({
            success: true,
            message: 'Password successfully reset! You are now logged in.',
            user
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
