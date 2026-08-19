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

export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
  content?: string;
  path: string;
}

export type ProjectStatus = 'idle' | 'generating' | 'completed' | 'interrupted' | 'error';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IProject {
  _id: string;
  userId: any;
  name: string;
  prompt: string;
  steps: Step[];
  files: FileItem[];
  activeFile?: string | null;
  currentStep?: string | number | null;
  status: ProjectStatus;
  chatMessages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
}
