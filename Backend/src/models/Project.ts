import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IProject, Step, FileItem, ChatMessage, ProjectStatus } from '../types/project.types.js';

export interface IProjectDocument extends Omit<IProject, '_id'>, Document {}

const StepSchema = new Schema<Step>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'error'],
      default: 'pending'
    },
    code: { type: String },
    path: { type: String }
  },
  { _id: false }
);

const FileItemSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['file', 'folder'], required: true },
    children: { type: [Schema.Types.Mixed], default: undefined },
    content: { type: String },
    path: { type: String, required: true }
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<ChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true }
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProjectDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      default: 'Untitled Project',
      trim: true,
      maxlength: 100
    },
    prompt: {
      type: String,
      required: true,
      trim: true
    },
    steps: {
      type: [StepSchema],
      default: []
    },
    files: {
      type: [FileItemSchema],
      default: []
    },
    activeFile: {
      type: String,
      default: null
    },
    currentStep: {
      type: Schema.Types.Mixed,
      default: null
    },
    status: {
      type: String,
      enum: ['idle', 'generating', 'completed', 'interrupted', 'error'],
      default: 'idle'
    },
    chatMessages: {
      type: [ChatMessageSchema],
      default: []
    },
    lastOpenedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying a user's projects sorted by updatedAt
ProjectSchema.index({ userId: 1, updatedAt: -1 });

export const Project: Model<IProjectDocument> =
  (mongoose.models.Project as Model<IProjectDocument>) ||
  mongoose.model<IProjectDocument>('Project', ProjectSchema);
