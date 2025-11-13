

// controller to create a new project or add a new project
// import {ProjectModel} from '../models/ProjectModels.js';

import { invitationAuthToken } from "../../middleware/authMiddleware.js";
import { InvitationTracking } from "../../models/PlatformModel/invitaionTrakingModel.js";
import { PartnerModel } from "../../models/PlatformModel/partnerModel.js";
import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import User from "../../models/UserModel.js";
import { sendInvitationEmail } from "../../services/emailService.js";

// import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";

export const createProject = async (req, res) => {
  try {
    const { projectData,userId } = req.body;
    //payload for project creation
//     Project Created with answers: 
// {projectName: 'hbsshbjhs', projectType: 'mobile', description: 'sdjbfvdsjfjdsfs', teamSize: 'large', timeline: 'year'}
// description
// : 
// "sdjbfvdsjfjdsfs"
// projectName
// : 
// "hbsshbjhs"
// projectType
// : 
// "mobile"
// teamSize
// : 
// "large"
// timeline
// : 
// "year"
// [[Prototype]]
// : 
    if (!userId) {
      return res.status(400).json({message:"userId is required"})
    }

    // Validate required fields
    if (!projectData) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // find the user
    const user = await User.findById(userId);
    // check the partnerDetails
    const checkPartner = await PartnerModel.findOne({
      email:user.email
    })
    // check user acces for the project
    const userAccess = await UserWorkAccess.findOne({
      partnerId:checkPartner.partnerId
    })
  
    // Create a new project instance
    const newProject =   new ProjectModel({
      partnerId:checkPartner  && userAccess.accessType >200 ? checkPartner.partnerId : "" ,
      projectName:projectData.projectName,
      description:projectData.description,
      projectType:projectData.projectType,
      status:'active',
      teamSize:projectData.teamSize,
      partnerCode:checkPartner  && userAccess.accessType >200 ? checkPartner.partnerCode : "" ,
      startDate: Date.now(), // Ensure startDate is a Date object
    });

    // Save the project to the database
    await newProject.save();
    await UserWorkAccess.create({
      userId:userId,
      projectId:newProject.projectId,
      accessType:300,
      partnerId:checkPartner ? checkPartner.partnerId : "",
      status:'accepted',
      invitedBy:userId,
    });

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

export const inviteUserToProject = async (req, res) => {
  const { projectId, userEmail, accessLevel, partnerId ,invitedBy} = req.body;

  try {
    if (!projectId || !userEmail || !accessLevel || !partnerId) {
      return res.status(400).json({
        message: "Project ID, Partner ID, User Email, and Access Level are required",
      });
    }

    // 1️⃣ Check if a pending invitation already exists
    const existingInvitation = await UserWorkAccess.findOne({
      projectId,
      partnerId,
      invitedEmail: userEmail,
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(400).json({ message: "Invitation already sent to this user" });
    }

    // 2️⃣ Generate invitation token
    const inviteToken = invitationAuthToken(invitedBy, projectId, partnerId, userEmail);

    // 3️⃣ Create pending UserWorkAccess record
    const accessRecord = new UserWorkAccess({
      projectId,
      partnerId,
      invitedBy,
      accessType: accessLevel || 100, // Default to Viewer if not specified
      status: "pending",
      userId: null, // User not registered yet
      invitedEmail: userEmail, // Add the email to track pending invitations
    });
    await accessRecord.save();

    // 4️⃣ Store invitation in InvitationTracking
    const invitationTracking = new InvitationTracking({
      email: userEmail,
      invitedBy,
      projectId,
      partnerId,
      revoked: false,
      // timestamp will default to now
    });
    await invitationTracking.save();
    const partnerDetails = await PartnerModel.findById(partnerId).lean();
    const projectDetails = await ProjectModel.find(
      { projectId: projectId }
    );
    console.log("partnerDetails:",partnerDetails);
    console.log("projectDetails:",projectDetails);

    // 5️⃣ Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL}/invitation?inviteToken=${inviteToken}`;
    await sendInvitationEmail( {
      partnerName:partnerDetails?.businessName|| "our team",
      projectName:projectDetails?.name|| "the project",
      invitaitonLink:inviteLink,
      role: accessLevel|| 100,
      to:userEmail,

    });

    return res.status(200).json({
      success: true,
      message: "Invitation sent successfully",
      inviteToken,
    });
  } catch (err) {
    console.error("Error inviting user:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const acceptInvitataion=async (req,res)=>{
  const {
    invitedBy, projectId, partnerId, userEmail
  }= req.body;
  try {
  if(!invitedBy || !projectId|| !partnerId,!userEmail){
    return res.status(404).json({msg:"missing required parameter"})
  }
    const projectDetails = await UserWorkAccess.findOne({
      invitedBy:invitedBy,
     projectId:projectId,
     partnerId:partnerId,
     userEmail:userEmail

    })
    // const accept== await

  } catch (error) {
    
  }


}