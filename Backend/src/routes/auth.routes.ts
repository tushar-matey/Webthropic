import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} from '../utils/validation.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.middleware.js';

export const authRouter = Router();

// Registration & Login
authRouter.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

authRouter.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

authRouter.post('/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

// Current authenticated user
authRouter.get('/me', (req, res, next) => {
  authController.me(req, res, next);
});

// Email verification
authRouter.get('/verify-email', (req, res, next) => {
  authController.verifyEmail(req, res, next);
});

authRouter.post('/verify-email', validateBody(verifyEmailSchema), (req, res, next) => {
  authController.verifyEmail(req, res, next);
});

authRouter.post('/resend-verification', authRateLimiter, validateBody(resendVerificationSchema), (req, res, next) => {
  authController.resendVerification(req, res, next);
});

// Password recovery
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  (req, res, next) => {
    authController.forgotPassword(req, res, next);
  }
);

authRouter.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateBody(resetPasswordSchema),
  (req, res, next) => {
    authController.resetPassword(req, res, next);
  }
);

// Google OAuth
authRouter.get('/google', (req, res, next) => {
  const isConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  if (!isConfigured) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

authRouter.get(
  '/google/callback',
  (req, res, next) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    passport.authenticate('google', {
      failureRedirect: `${clientUrl}/login?error=google_failed`
    })(req, res, next);
  },
  (req, res, next) => {
    authController.oauthCallbackSuccess(req, res, next);
  }
);

// GitHub OAuth
authRouter.get('/github', (req, res, next) => {
  const isConfigured = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;
  if (!isConfigured) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('github', {
    scope: ['user:email']
  })(req, res, next);
});

authRouter.get(
  '/github/callback',
  (req, res, next) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    passport.authenticate('github', {
      failureRedirect: `${clientUrl}/login?error=github_failed`
    })(req, res, next);
  },
  (req, res, next) => {
    authController.oauthCallbackSuccess(req, res, next);
  }
);
