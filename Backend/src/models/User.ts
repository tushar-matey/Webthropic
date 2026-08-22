import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IUser, SanitizedUser } from '../types/user.types.js';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  toSanitized(): SanitizedUser;
}

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

// Method to sanitize user object for client responses
UserSchema.methods.toSanitized = function (): SanitizedUser {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt ?? null
  };
};

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);
