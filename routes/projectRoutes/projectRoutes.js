import { validateToken } from '../../controllers/authController.js';
import { acceptInvitataion, addSerivceToProjectV1, checkValidPartnerCode, createProject, deleteProject, getAllRunningProjectServicebyProjectId, getProjectById, getUserAnalyticsAgg, HoraProjectServicesV1, invitationDetails, inviteUserToProject, listUserAccessibleProjects, projectMemberController, ticketConfigurator, updateProject, updateServiceStatus, userWithProjectRights } from '../../controllers/ProjectController/projectController.js';


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

projectRoutes.post("/v1/projects/:projectId/config",authenticateToken,ticketConfigurator)
projectRoutes.post("/v1/projects/manage",authenticateToken,projectMemberController)
projectRoutes.post("/v1/partnerCode/check",authenticateToken,checkValidPartnerCode)


//=================user analytics===========
projectRoutes.post('/v1/user-projects/getAll',authenticateToken,getUserAnalyticsAgg)

//===============services=============
projectRoutes.get('/v1/user-projects/services/bump',authenticateToken,HoraProjectServicesV1)
projectRoutes.post('/v1/user-projects/services/associate',authenticateToken,addSerivceToProjectV1)
projectRoutes.get('/v1/user-projects/services/active',authenticateToken,getAllRunningProjectServicebyProjectId)
projectRoutes.post('/v1/user-projects/services/service/update',authenticateToken,updateServiceStatus)



export default projectRoutes;