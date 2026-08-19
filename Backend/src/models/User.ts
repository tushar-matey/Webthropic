import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IUser, SanitizedUser } from '../types/user.types.js';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  toSanitized(): SanitizedUser;
}

const OAuthAccountSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['google', 'github']
    },
    providerAccountId: {
      type: String,
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    avatar: {
      type: String
    }
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 64
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'github', 'oauth'],
      default: 'local'
    },
    oauthAccounts: {
      type: [OAuthAccountSchema],
      default: []
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
      index: true
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      index: true
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for OAuth provider lookups
UserSchema.index(
  { 'oauthAccounts.provider': 1, 'oauthAccounts.providerAccountId': 1 },
  { sparse: true }
);

// Method to sanitize user object for client responses
UserSchema.methods.toSanitized = function (): SanitizedUser {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar ?? null,
    emailVerified: this.emailVerified,
    provider: this.provider,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt ?? null
  };
};

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);
