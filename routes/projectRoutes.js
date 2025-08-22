import { createProject, deleteProject, getProjectById, getProjects, updateProject } from '../controllers/projectController.js';


// const express = require('express');
import express from 'express';

 const projectRoutes = express.Router();

projectRoutes.get('/v1/projects',getProjects);
projectRoutes.get('/v1/projects/:id', getProjectById);
projectRoutes.post('/v1/projects', createProject);
projectRoutes.put('/v1/projects/:id', updateProject);
projectRoutes.delete('/v1/projects/:id', deleteProject);
export default projectRoutes;