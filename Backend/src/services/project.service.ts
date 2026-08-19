import { Project, type IProjectDocument } from '../models/Project.js';
import type { IProject, Step, FileItem, ChatMessage, ProjectStatus } from '../types/project.types.js';

export interface CreateProjectInput {
  name?: string;
  prompt: string;
  steps?: Step[];
  files?: FileItem[];
  status?: ProjectStatus;
  chatMessages?: ChatMessage[];
}

export interface UpdateProjectInput {
  name?: string;
  prompt?: string;
  steps?: Step[];
  files?: FileItem[];
  activeFile?: string | null;
  currentStep?: string | number | null;
  status?: ProjectStatus;
  chatMessages?: ChatMessage[];
}

export class ProjectService {
  /**
   * Create a new project for an authenticated user
   */
  async createProject(userId: string, data: CreateProjectInput): Promise<IProjectDocument> {
    // Generate a default project name from prompt if not specified
    const name = data.name?.trim() || data.prompt.slice(0, 40).trim() || 'Untitled Project';

    const project = await Project.create({
      userId,
      name,
      prompt: data.prompt,
      steps: data.steps || [],
      files: data.files || [],
      status: data.status || 'idle',
      chatMessages: data.chatMessages || [],
      lastOpenedAt: new Date()
    });

    return project;
  }

  /**
   * Get all projects for an authenticated user sorted by recent activity
   */
  async getUserProjects(userId: string) {
    const projects = await Project.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return projects.map((p) => {
      const steps = (p.steps || []) as Step[];
      const completedSteps = steps.filter((s) => s.status === 'completed').length;

      return {
        id: p._id.toString(),
        name: p.name,
        prompt: p.prompt,
        status: p.status,
        totalSteps: steps.length,
        completedSteps,
        fileCount: (p.files || []).length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        lastOpenedAt: p.lastOpenedAt
      };
    });
  }

  /**
   * Get a single project by ID, ensuring user ownership
   */
  async getProjectById(projectId: string, userId: string): Promise<IProjectDocument | null> {
    const project = await Project.findOne({
      _id: projectId,
      userId
    });

    if (project) {
      project.lastOpenedAt = new Date();
      await project.save();
    }

    return project;
  }

  /**
   * Update a project with debounced autosaved content
   */
  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectInput
  ): Promise<IProjectDocument | null> {
    const project = await Project.findOne({
      _id: projectId,
      userId
    });

    if (!project) {
      return null;
    }

    if (data.name !== undefined) project.name = data.name;
    if (data.prompt !== undefined) project.prompt = data.prompt;
    if (data.steps !== undefined) project.steps = data.steps;
    if (data.files !== undefined) project.files = data.files;
    if (data.activeFile !== undefined) project.activeFile = data.activeFile;
    if (data.currentStep !== undefined) project.currentStep = data.currentStep;
    if (data.status !== undefined) project.status = data.status;
    if (data.chatMessages !== undefined) project.chatMessages = data.chatMessages;

    project.lastOpenedAt = new Date();
    await project.save();

    return project;
  }

  /**
   * Delete a project, ensuring user ownership
   */
  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const result = await Project.deleteOne({
      _id: projectId,
      userId
    });

    return (result.deletedCount || 0) > 0;
  }
}

export const projectService = new ProjectService();
