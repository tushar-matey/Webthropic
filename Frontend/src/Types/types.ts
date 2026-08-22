export enum StepType {
  CreateFile,
  CreateFolder,
  EditFile,
  DeleteFile,
  RunScript
}

export interface Step {
  id: string;
  title: string;
  description: string;
  type: StepType;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  code?: string;
  path?: string;
}

export interface Project {
  prompt: string;
  steps: Step[];
}

export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
  content?: string;
  path: string;
}

export interface FileViewerProps {
  file: FileItem | null;
  onClose: () => void;
}

export type ProjectStatus = 'idle' | 'generating' | 'completed' | 'interrupted' | 'error';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  prompt: string;
  status: ProjectStatus;
  totalSteps: number;
  completedSteps: number;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface FullProject {
  _id: string;
  id?: string;
  userId: string;
  name: string;
  prompt: string;
  steps: Step[];
  files: FileItem[];
  activeFile?: string | null;
  currentStep?: string | number | null;
  status: ProjectStatus;
  chatMessages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}