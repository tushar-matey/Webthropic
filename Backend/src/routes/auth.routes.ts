import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
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
