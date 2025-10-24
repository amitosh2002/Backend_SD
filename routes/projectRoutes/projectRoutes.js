import { validateToken } from '../../controllers/authController.js';
import { createProject, deleteProject, getProjectById, listUserAccessibleProjects, updateProject } from '../../controllers/ProjectController/projectController.js';


// const express = require('express');
import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';

 const projectRoutes = express.Router();

// Get user's accessible projects
projectRoutes.post('/v1/user-projects', authenticateToken, listUserAccessibleProjects);

// CRUD operations for projects
projectRoutes.post('/v1/projects', authenticateToken, createProject);
projectRoutes.get('/v1/projects/:id', authenticateToken, getProjectById);
projectRoutes.put('/v1/projects/:id', authenticateToken, updateProject);
projectRoutes.delete('/v1/projects/:id', authenticateToken, deleteProject);


export default projectRoutes;