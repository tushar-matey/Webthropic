export interface IOAuthAccount {
  provider: 'google' | 'github';
  providerAccountId: string;
  email?: string | null;
  avatar?: string | null;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  avatar?: string | null;
  emailVerified: boolean;
  provider: 'local' | 'google' | 'github' | 'oauth';
  oauthAccounts: IOAuthAccount[];
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  emailVerified: boolean;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}
