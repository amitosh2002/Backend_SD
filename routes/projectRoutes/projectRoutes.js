import { validateToken } from '../../controllers/authController.js';
import { acceptInvitataion, createProject, deleteProject, getProjectById, invitationDetails, inviteUserToProject, listUserAccessibleProjects, updateProject, userWithProjectRights } from '../../controllers/ProjectController/projectController.js';


// const express = require('express');
import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';

 const projectRoutes = express.Router();

// Get user's accessible projects
projectRoutes.post('/v1/user-projects', authenticateToken, listUserAccessibleProjects);
projectRoutes.post('/v1/userProjectWithRights', authenticateToken, userWithProjectRights);

// CRUD operations for projects
projectRoutes.post('/v1/projects', authenticateToken, createProject);
projectRoutes.get('/v1/projects/:id', authenticateToken, getProjectById);
projectRoutes.put('/v1/projects/:id', authenticateToken, updateProject);
projectRoutes.delete('/v1/projects/:id', authenticateToken, deleteProject);
projectRoutes.post('/v1/invite/invitaion', authenticateToken, inviteUserToProject);
// projectRoutes.post('/v1/invite/invitaion-details',  invitationDetails);
projectRoutes.post('/v1/invite/invitation-details', invitationDetails);
projectRoutes.post('/v1/invite/invitation-accept', acceptInvitataion);




export default projectRoutes;