import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { buildProjectZip } from '../utils/buildProjectZip.js';

export class ProjectController {
  /**
   * POST /api/projects
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const project = await projectService.createProject(userId.toString(), req.body);
      res.status(201).json({
        success: true,
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects
   */
  async getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const projects = await projectService.getUserProjects(userId.toString());
      res.status(200).json({
        success: true,
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id
   */
  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }

      const project = await projectService.getProjectById(id, userId.toString());
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/projects/:id
   */
  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }

      const updatedProject = await projectService.updateProject(id, userId.toString(), req.body);
      if (!updatedProject) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id
   */
  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }

      const deleted = await projectService.deleteProject(id, userId.toString());
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Project successfully deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/download
   */
  async downloadProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || req.session?.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }

      const project = await projectService.getProjectById(id, userId.toString());
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
        return;
      }

      const zipBuffer = await buildProjectZip(project.files || []);

      const rawName = (project.name || 'project').trim();
      const sanitizedName = rawName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'project';
      const encodedFilename = encodeURIComponent(sanitizedName);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${sanitizedName}.zip"; filename*="UTF-8''${encodedFilename}.zip"`
      );
      res.setHeader('Content-Length', zipBuffer.length);

      res.status(200).send(zipBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
