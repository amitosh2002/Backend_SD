

// controller to create a new project or add a new project
// import {ProjectModel} from '../models/ProjectModels.js';

import mongoose from "mongoose";
import { invitationAuthToken } from "../../middleware/authMiddleware.js";
import { InvitationTracking } from "../../models/PlatformModel/invitaionTrakingModel.js";
import { PartnerModel } from "../../models/PlatformModel/partnerModel.js";
import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import User from "../../models/UserModel.js";
import { sendInvitationEmail } from "../../services/emailService.js";
import { accesTypeView } from "../../utility/platformUtility.js";
import { TicketModel } from "../../models/TicketModels.js";

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

// export const userWithProjectRights = async (req, res) => {
//   try {
//     const userId = req.body.userId;

//     if (!userId) {
//       return res.status(401).json({ msg: "Unauthorized access" });
//     }

//     const projectAccess = await UserWorkAccess.find({
//       userId,
//       accessType: { $gte: 300 },
//       status: "accepted"
//     });

//     console.log("UserWorkAccess rows:", projectAccess);

//     if (!projectAccess.length) {
//       return res.status(404).json({ msg: "No access" });
//     }

//     let projectArray = [];

//     for (let access of projectAccess) {
//       const pid = access.projectId;
//       console.log("Searching projectId:", pid);

//       let proj = await PartnerModel.findOne({ projectId: pid });

//       if (!proj) {
//         try {
//           proj = await PartnerModel.findById(pid);
//         } catch (e) {}
//       }

//       console.log("Found project:", proj);

//       if (proj) {
//         projectArray.push({
//           id: proj.projectId ?? proj._id,
//           name: proj.projectName,
//           status: proj.status
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       userProjectWithRights: projectArray,
//       msg: "Success"
//     });

//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ msg: "Server error", error });
//   }
// };

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};

export const userWithProjectRights = async (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized access" });
    }

    const projectAccess = await UserWorkAccess.find({
      userId: new mongoose.Types.ObjectId(userId),
      accessType: { $gte: 300 },
      status: "accepted",
    }).lean();

    let projectArray = [];

    for (let access of projectAccess) {
      const pid = access.projectId;

        const proj = await ProjectModel.findOne({ projectId: pid }).lean();


      if (proj) {
        projectArray.push({
          id: proj.projectId,
          name: proj.name?? proj.projectName,
        }
      );
      }
    }

    return res.status(200).json({
      success: true,
      userProjectWithRights: projectArray,
      msg: "Success",
    });

  } catch (error) {
    console.error("Error in getAllProjectsForUser:", error);
    return res.status(500).json({ msg: "Internal Server Error", error });
  }
};

export const inviteUserToProject = async (req, res) => {
  const { projectId, emails, accessType, message, invitedBy } = req.body
;

  console.log("first controller call")

  try {
    // -------------------------
    // 1️⃣ Validate Input
    // -------------------------
    if (!projectId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project ID and at least one email are required",
      });
    }

    // -------------------------
    // 2️⃣ Fetch Project and Partner
    // -------------------------
    const projectDetails = await ProjectModel.findOne({ projectId }).lean();
    if (!projectDetails) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const partnerId = projectDetails.partnerId;
    const partnerDetails = await PartnerModel.findOne({partnerId}).lean();

    // -------------------------
    // 3️⃣ Prepare Response
    // -------------------------
    const results = [];

    // -------------------------
    // 4️⃣ Process Each Email
    // -------------------------
    for (const email of emails) {
      // Check existing invite
      const existingInvitation = await UserWorkAccess.findOne({
        projectId,
        partnerId,
        invitedEmail: email,
        status: "pending",
      });

      if (existingInvitation) {
        results.push({
          email,
          status: "already_sent",
          message: "Invitation already sent to this email",
        });
        continue; // skip to next email
      }


      // Create UserWorkAccess record
      await UserWorkAccess.create({
        projectId,
        partnerId,
        invitedBy,
        accessType: accessType || 100,
        status: "pending",
        userId: null,
        invitedEmail: email,
      });

      // Save Invitation Tracking
      const inviteRes = await InvitationTracking.create({
        email,
        invitedBy,
        projectId,
        partnerId,
        revoked: false,
      });

      // Generate invite token
      const inviteToken = invitationAuthToken(invitedBy, projectId, partnerId, email,inviteRes?.invitationId,accessType);
      // Email content
      const inviteLink = `${process.env.FRONTEND_URL}/invitation?inviteToken=${inviteToken}`;
      console.log(inviteLink, "invite link here")
      // Send Emaily
      await sendInvitationEmail({
        partnerName: partnerDetails?.businessName || "Our Team",
        projectName: projectDetails?.name || "Your Project",
        invitationLink: inviteLink,   // CORRECT
        role: accesTypeView(accessType) || accesTypeView(100),
        to: email,
        message,
      });

      // Push success response
      results.push({
        email,
        status: "sent",
        inviteToken,
        message: "Invitation sent successfully",
      });
    }

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (err) {
    console.error("Error inviting user:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const acceptInvitataion = async (req, res) => {
  try {
    const { invitationId } = req.body;

    if (!invitationId) {
      return res.status(400).json({
        success: false,
        message: "invitationId is required",
      });
    }

    // 1️⃣ Fetch invitation tracking details
    const inviteDetails = await InvitationTracking.findOne({ invitationId });

    if (!inviteDetails) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation",
      });
    }

    if (inviteDetails.revoked) {
      return res.status(403).json({
        success: false,
        message: "This invitation has been revoked",
      });
    }

    const { email, projectId, partnerId } = inviteDetails;
    console.log(inviteDetails)

    // 2️⃣ Check if the user exists → OPTIONAL userId
    const existingUser = await User.findOne({ email });

    let userIdToAssign = null;
    if (existingUser) {
      userIdToAssign = existingUser._id;
    }

    // 3️⃣ Find pending invite in UserWorkAccess
    const accessRecord = await UserWorkAccess.findOne({
      projectId,
      partnerId,
      invitedEmail: email,
      status: "pending",
    });
    console.log(accessRecord,"accessRecord")
    if (!accessRecord) {
      return res.status(404).json({
        success: false,
        message: "No pending invitation found for this email",
      });
    }

    // 4️⃣ Update entry → set userId ONLY if user exists
    accessRecord.userId = userIdToAssign;
    accessRecord.status = "accepted";
    await accessRecord.save();

    // 5️⃣ Mark invitation accepted in tracking table
    inviteDetails.acceptedAt = new Date();
    await inviteDetails.save();

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      userLinked: existingUser ? true : false,
      note: existingUser
        ? "User found and linked"
        : "User not found. Will link automatically after signup.",
      projectId,
      partnerId,
    });

  } catch (error) {
    console.error("Error in acceptInvitation:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during acceptance",
      error: error.message,
    });
  }
};

export const invitationDetails = async (req, res) => {
  try {
    // const { invitedBy, projectId } = req.body;
    const invitedBy=req.body.invitedBy;
    const projectId=req.body.projectId;

    // Validation
    if (!invitedBy || !projectId) {
      return res.status(400).json({
        success: false,
        message: "invitedBy and projectId are required",
      });
    }

    // Fetch project details
    const projectDetails = await ProjectModel.findOne({ projectId });
    if (!projectDetails) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Fetch user details
    const userDetails = await User.findOne({ _id: invitedBy }).select(
      "name username email"
    );
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Invited-by user not found",
      });
    }

    // SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      message: "Invitation details fetched",
      data: {
        project: projectDetails.name ?? projectDetails.projectName,
        invitedBy: userDetails.username ?? userDetails.name,
      },
    });
  } catch (error) {
    console.error("Error fetching invitation details:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
