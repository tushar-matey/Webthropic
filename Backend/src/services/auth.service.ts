import { User } from '../models/User.js';
import { hashPassword, verifyPassword, generateRandomToken, hashToken } from '../utils/crypto.js';
import { emailService } from './email.service.js';
import type { SanitizedUser } from '../types/user.types.js';

export class AuthService {
  /**
   * Register a new user with email and password
   */
  async register(name: string, email: string, password: string): Promise<SanitizedUser> {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error: any = new Error('An account with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const rawVerificationToken = generateRandomToken(32);
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      provider: 'local',
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      lastLoginAt: new Date()
    });

    // Send verification email asynchronously
    emailService.sendVerificationEmail(user.email, user.name, rawVerificationToken).catch((err) => {
      console.error('[AuthService] Failed to send verification email:', err);
    });

    return user.toSanitized();
  }

  /**
   * Log in an existing user with email and password
   */
  async login(email: string, password: string): Promise<SanitizedUser> {
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      // Perform a dummy hash check to prevent timing analysis
      await verifyPassword(password, '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$dHVzaGFy');
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Verify password with Argon2id
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    return user.toSanitized();
  }

  /**
   * Verify user email via token
   */
  async verifyEmail(rawToken: string): Promise<SanitizedUser> {
    const tokenHash = hashToken(rawToken);

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      const error: any = new Error('Invalid or expired email verification token');
      error.statusCode = 400;
      throw error;
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return user.toSanitized();
  }

  /**
   * Resend verification email
   */
  async resendVerification(email?: string, userId?: string): Promise<{ success: boolean; message: string }> {
    let user = null;

    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return { success: true, message: 'If an account exists, a verification link has been sent' };
    }

    if (user.emailVerified) {
      return { success: true, message: 'This email is already verified' };
    }

    const rawToken = generateRandomToken(32);
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    emailService.sendVerificationEmail(user.email, user.name, rawToken).catch((err) => {
      console.error('[AuthService] Failed to resend verification email:', err);
    });

    return { success: true, message: 'Verification link sent' };
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return generic success message to prevent user enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };
    }

    const rawResetToken = generateRandomToken(32);
    user.passwordResetTokenHash = hashToken(rawResetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    emailService.sendPasswordResetEmail(user.email, user.name, rawResetToken).catch((err) => {
      console.error('[AuthService] Failed to send password reset email:', err);
    });

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<SanitizedUser> {
    const tokenHash = hashToken(rawToken);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      const error: any = new Error('Invalid or expired password reset token');
      error.statusCode = 400;
      throw error;
    }

    // Hash new password
    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.lastLoginAt = new Date();
    await user.save();

    return user.toSanitized();
  }

  /**
   * Fetch sanitized user by ID
   */
  async getUserById(id: string): Promise<SanitizedUser | null> {
    const user = await User.findById(id);
    return user ? user.toSanitized() : null;
  }
}

export const authService = new AuthService();
