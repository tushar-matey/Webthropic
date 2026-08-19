import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../utils/validation.js';

export const projectRouter = Router();

// Protect all project routes
projectRouter.use(requireAuth);

// Create a project
projectRouter.post('/', validateBody(createProjectSchema), (req, res, next) => {
  projectController.createProject(req, res, next);
});

// List all projects for current user
projectRouter.get('/', (req, res, next) => {
  projectController.getProjects(req, res, next);
});

// Get specific project by ID
projectRouter.get('/:id', (req, res, next) => {
  projectController.getProjectById(req, res, next);
});

// Update project by ID (debounced autosave)
projectRouter.patch('/:id', validateBody(updateProjectSchema), (req, res, next) => {
  projectController.updateProject(req, res, next);
});

// Delete project by ID
projectRouter.delete('/:id', (req, res, next) => {
  projectController.deleteProject(req, res, next);
});
