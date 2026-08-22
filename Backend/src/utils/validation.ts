import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64, 'Name cannot exceed 64 characters').trim(),
  email: z.string().email('Invalid email address').max(255).trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1, 'Prompt is required').max(10000),
  steps: z.array(z.any()).optional(),
  files: z.array(z.any()).optional(),
  status: z.enum(['idle', 'generating', 'completed', 'interrupted', 'error']).optional()
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().max(10000).optional(),
  steps: z.array(z.any()).optional(),
  files: z.array(z.any()).optional(),
  activeFile: z.string().nullable().optional(),
  currentStep: z.union([z.string(), z.number()]).nullable().optional(),
  status: z.enum(['idle', 'generating', 'completed', 'interrupted', 'error']).optional(),
  chatMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});
