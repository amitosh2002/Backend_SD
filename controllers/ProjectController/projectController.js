

// controller to create a new project or add a new project
// import {ProjectModel} from '../models/ProjectModels.js';

import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";

// import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";

export const createProject = async (req, res) => {
  try {
    const { name, description, startDate } = req.body;

    // Validate required fields
    if (!name || !description || !startDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create a new project instance
    const newProject = new ProjectModel({
      name,
      description,
      startDate: new Date(startDate), // Ensure startDate is a Date object
    });

    // Save the project to the database
    await newProject.save();

    res.status(201).json({ message: 'Project created successfully', project: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
export const getProjects = async (req, res) => {
  try {
    const projects = await ProjectModel.find();
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const project = await ProjectModel.findById(id);
    if (!project) {         
        return res.status(404).json({ message: 'Project not found' });
        }
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Internal server error' });
  } 
}

export const updateProject = async (req, res) => {

    const { id } = req.params;
    const { name, description, startDate } = req.body;
    
    try {
        const updatedProject = await ProjectModel.findByIdAndUpdate(
        id,
        { name, description, startDate: new Date(startDate) },
        { new: true }
        );
    
        if (!updatedProject) {
        return res.status(404).json({ message: 'Project not found' });
        }
    
        res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
    }

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    
    try {
        const deletedProject = await ProjectModel.findByIdAndDelete(id);
    
        if (!deletedProject) {
        return res.status(404).json({ message: 'Project not found' });
        }
    
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const listUserAccessibleProjects = async (req, res) => {
  const { userId } = req.body;

  try {
    // Step 1: Get all user access records
    const userAccessibleProjects = await UserWorkAccess.find({ userId });

    if (!userAccessibleProjects || userAccessibleProjects.length === 0) {
      return res.status(404).json({ message: "No accessible projects found for this user" });
    }

    // Step 2: Extract project IDs (string values)
    const accessProjectIds = userAccessibleProjects
      .map(access => access.projectId)
      .filter(Boolean);

    // Step 3: Find projects matching those string IDs
    const projects = await ProjectModel.find({ projectId: { $in: accessProjectIds } }).lean();

    // Step 4: Send back both access info and project details
    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Error retrieving user accessible projects:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};