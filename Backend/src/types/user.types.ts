export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  avatar?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}
