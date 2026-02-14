

// controller to create a new project or add a new project
// import {ProjectModel} from '../models/ProjectModels.js';

import mongoose, { set } from "mongoose";
import { invitationAuthToken } from "../../middleware/authMiddleware.js";
import { InvitationTracking } from "../../models/PlatformModel/invitaionTrakingModel.js";
import { PartnerModel } from "../../models/PlatformModel/partnerModel.js";
import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import User from "../../models/UserModel.js";
import { sendInvitationEmail } from "../../services/emailService.js";
import { accesTypeView, autoCreateDefaultBoardAndFlow, buildDropdownConfigFromFlow, getFullprojectCurrentWorkdetails, getUserDetailById } from "../../utility/platformUtility.js";
import { TicketModel } from "../../models/TicketModels.js";
import { TicketConfig } from "../../models/PlatformModel/TicketUtilityModel/TicketConfigModel.js";
import HoraServiceSchema from "../../models/HoraInternal/HoraServiceSchema.js";
import ProjectService from "../../models/PlatformModel/ProjectServiceSchema.js";
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import SprintBoardConfig from "../../models/PlatformModel/SprintModels/confrigurator/sprintBoardModel.js";

// import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";

export const createProject = async (req, res) => {
  try {
    const { projectData } = req.body;
    // Prefer server-derived user id from auth token to avoid trusting client payload
    const userId = req.body.userId || (req.user && req.user.userId);
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
      email:user?.email
    })
    // check user acces for the project
    const userAccess = await UserWorkAccess.findOne({
      partnerId:checkPartner?.partnerId
    })
  
    // Create a new project instance
const newProject = new ProjectModel({
  partnerId:
    checkPartner && userAccess?.accessType > 200
      ? checkPartner.partnerId
      : "",
  projectName: projectData.projectName,
  description: projectData.description,
  projectType: projectData.projectType,
  status: "active",
  teamSize: projectData.teamSize,
  partnerCode:
    checkPartner && userAccess?.accessType > 200
      ? checkPartner.partnerCode
      : "",
  startDate: Date.now(),
});
  

    // Save the project to the database
    await newProject.save();
    await UserWorkAccess.create({
      userId:userId,
      projectId:newProject.projectId,
      accessType:400,
      partnerId:checkPartner ? checkPartner.partnerId : "",
      status:'accepted',
      invitedBy:userId,
    });

    // adding default flow and sprint board 
      try {
      console.log("Calling autoCreateDefaultBoardAndFlow for project:", newProject.projectId, "user:", userId);
      await autoCreateDefaultBoardAndFlow({
        projectId: newProject.projectId,
        userId: userId,
        workflowSource: "PROJECT",
      });
      console.log("autoCreateDefaultBoardAndFlow completed for project:", newProject.projectId);
    } catch (err) {
      console.error("autoCreateDefaultBoardAndFlow failed:", err);
      // don't block project creation on board/flow creation failure
    }

    res.status(201).json({ message: 'Project created successfully', project: newProject ,status:201});
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
  // const { userId } = req.body;
  const userId=req.user.userId;

  try {
    // 1. Get all access records in one go
    const userAccessRecords = await UserWorkAccess.find({ userId }).lean();

    if (!userAccessRecords.length) {
      return res.status(404).json({ message: "No accessible projects found" });
    }

    // 2. Extract unique Project IDs
    const accessProjectIds = userAccessRecords.map(a => a.projectId).filter(Boolean);

    // 3. Get Project Metadata
    const projects = await ProjectModel.find({ 
      projectId: { $in: accessProjectIds } 
    }).lean().select("projectId projectName images category description partnerCode status");
    // 4. OPTIMIZED: Fetch all "Work Details" in parallel
    // We map each project to a Promise, then resolve them all at once
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const workDetails = await getFullprojectCurrentWorkdetails(project.projectId, userId);
        return {
          ...project,
          projectOverview: workDetails
        };
      })
    );

    return res.status(200).json({
      count: projectsWithDetails.length,
      projects: projectsWithDetails,
    });

  } catch (error) {
    console.error("Error in listUserAccessibleProjects:", error);
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
        // partnerId,
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



// sprint board and flow for project 


/**
 * GET /api/platform/v1/scrum-flow/:projectId
 */
export const getStatusFlowForProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    console.log("[ScrumFlow] Fetching flow for project:", projectId);

    // 1️⃣ Try project-specific flow
    let flow = await ScrumProjectFlow.findOne({
      projectId,
      isActive: true,
      sourceType: "PROJECT",
    }).lean();

    // 2️⃣ Fallback to DEFAULT / TEMPLATE flow
    if (!flow) {
      console.log("[ScrumFlow] Project flow not found, using TEMPLATE");
      flow = await ScrumProjectFlow.findOne({
        projectId: "DEFAULT",
        isActive: true,
        sourceType: "TEMPLATE",
      }).lean();
    }

    if (!flow) {
      return res.status(404).json({
        message: "No scrum flow found",
      });
    }

    // 3️⃣ Normalize flow → dropdown config
    const dropdownConfig = buildDropdownConfigFromFlow(flow);

    return res.status(200).json({
      projectId,
      flowId: flow.id,
      flowName: flow.flowName,
      ...dropdownConfig,
    });
  } catch (error) {
    console.error("[ScrumFlow] Error:", error);
    return res.status(500).json({
      message: "Failed to fetch scrum flow",
    });
  }
};



export const getSprintBoardFlowForProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    console.log("[SprintBoard] Fetching board for project:", projectId);

    // 1️⃣ Try project-specific board
    let board = await SprintBoardConfig.findOne({
      projectId,
      isActive: true,
      workflowSource: "PROJECT",
    }).lean();

    // 2️⃣ Fallback to default board
    if (!board) {
      console.log("[SprintBoard] Project board not found, using default TEMPLATE");
      board = await SprintBoardConfig.findOne({
        projectId: "DEFAULT",
        isActive: true,
        workflowSource: "TEMPLATE",
      }).lean();
    }

    if (!board) {
      return res.status(404).json({
        message: "No sprint board found",
      });
    }

    // 3️⃣ Normalize board → dropdown config or frontend-ready structure
    const columnsSorted = [...board.columns].sort((a, b) => a.order - b.order);

    const statusColors = {};
    const statusWorkflow = {};
    const ticketFlowTypes = new Set();

    columnsSorted.forEach((column, index) => {
      const currentStatuses = column.statusKeys;
      const nextColumnStatuses = columnsSorted[index + 1]?.statusKeys || [];

      currentStatuses.forEach((status) => {
        ticketFlowTypes.add(status);

        if (!statusColors[status]) {
          statusColors[status] = {
            bg: `${column.color}22`,
            text: column.color,
            border: column.color,
          };
        }

        statusWorkflow[status] = Array.from(
          new Set([...currentStatuses, ...nextColumnStatuses])
        ).filter((s) => s !== status);
      });
    });

    return res.status(200).json({
      projectId,
      boardId: board.id,
      boardName: board.boardName,
      columns: columnsSorted,
      statusColors,
      statusWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes),
    });
  } catch (error) {
    console.error("[SprintBoard] Error:", error);
    return res.status(500).json({
      message: "Failed to fetch sprint board",
    });
  }
};


export const getUserAnalyticsAgg = async (req, res) => {
  const userId = req.user.userId;
  let {startDate,endDate}=req.query;
  const {projectId}=req.body;
  
  
  let now = new Date();

  if (!startDate && !endDate) {
    endDate = now;
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    endDate = endDate ? new Date(endDate) : now;
    startDate = startDate
      ? new Date(startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [allTickets,allUserProjects]=await Promise.all([
        TicketModel.find({
        projectId,
        assignee:userId,
        updatedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      }).select("title _id ticketKey status totalTimeLogged timeLogs "),
        UserWorkAccess.find({
          userId,
          status: "accepted",
        }).select("projectId").lean()
        ]);

  if(!allTickets){
    return res.status(404).json({
      message: "No tickets found",
    });
  }

  // await Promise.all([

  //   allTickets.map(async (ticket)=>{
  //     const priority = await TicketConfig.findOne({projectId:ticket.projectId}).select("priorities");
  //     const priorityName = priority.priorities.find((priority)=>priority.id===ticket.priority).name;
  //     ticket.priority = priorityName;
  //   })
    
  // ])

  if(!allUserProjects){
    return res.status(404).json({
      message: "No projects found",
    });
  }
  // this is full timelog of tickets not user specific
   const totalTimeLog = allTickets.reduce((acc, ticket) => {
    const ticketTime = (ticket.timeLogs || []).reduce((tAcc, log) => tAcc + (log.minutes || 0), 0);
    return acc + ticketTime;
  }, 0);
  const uniqueProject = [...new Set(allUserProjects.map((project)=>project.projectId))];
  let projectTimelog={}
  await new Promise(async (resolve, reject) => {
  try {
    // 1. Use map to create an array of promises
    const processingPromises = uniqueProject.map(async (projectId) => {

      const allTicket= await TicketModel.find({projectId,assignee:userId,updatedAt: { $gte: startDate, $lte: endDate, },}).lean();
      // Filter tickets for this specific project
      console.log(allTicket,"allTicket")
      const tickets = allTicket.filter((ticket) => ticket.projectId === projectId);
      // Calculate total time
        const totalTimeLogged = tickets.reduce((acc, ticket) => {
        // 1. Ensure timeLogs exists
        const logs = ticket.timeLogs || [];
        
        const ticketTime = logs.reduce((tAcc, log) => {
          // 2. Normalize both IDs to strings and trim any potential whitespace
          const entryUser = String(log.loggedBy || '').trim();
          const targetUser = String(userId || '').trim();

          // 3. Compare and add
          if (entryUser == targetUser && targetUser !== '') {

            return tAcc + (Number(log.minutes) || 0);
          }
          return tAcc;
        }, 0);

        return acc + ticketTime;
      }, 0);

      // 2. Fetch project name (await is now valid because the map callback is async)
      const project = await ProjectModel.findOne({projectId}).select("projectName").lean();
      
      // Use the name as key, fallback to ID if name not found
      const nameKey = project?.projectName || `Project-${projectId}`;
      
      return { name: nameKey, time: totalTimeLogged };
    });

    // 3. Wait for all database calls and calculations to finish
    const resultsArray = await Promise.all(processingPromises);

    // 4. Convert the results array back into your desired object format
    resultsArray.forEach(item => {
      projectTimelog[item.name] = item.time;
    });

    resolve(projectTimelog);
    return res.status(200).json({
      message: "User analytics fetched successfully",
      data: {
        totalTimeLog,
        tickets:allTickets,
        totalTickets:allTickets.length,
        projectTimelog,
      },
    });
  } catch (error) {
    reject(error);
  }
});

  


};




export const ticketConfigurator = async (req, res) => {
  const { projectId } = req.params;
  const { type, data } = req.body; 

  try {
    // take update query
    const updateQuery = {};
    
    // Only set the update if data is provided
    if (type && data) {
      updateQuery[type] = data;
    }
    // validate the ticket 
    const ticket=await TicketModel.find({projectId:projectId});

    if(!ticket){
      return res.status(404).json({msg:"Ticket not found"})
    }
    // update the ticket configuration for the project if not found it create a record 
    const updatedProject = await TicketConfig.findOneAndUpdate(
      { projectId: ticket?.projectId || projectId },
      { $set: updateQuery,
        projectId:ticket?.projectId
       },
      { new: true, upsert: true, }
    );

    // Logic: If type exists, return only that key. Otherwise, return all.
    const responseData = {
      success: true, // Fixed typo
    };

    if (type) {
      // Return only the specific requested array
      // e.g., if type is 'labels', response is { success: true, labels: [...] }
      responseData[type] = updatedProject[type];
    } else {
      // Return everything if type is null/undefined/empty
      responseData.labels = updatedProject.labels;
      responseData.priorities = updatedProject.priorities;
      responseData.conventions = updatedProject.conventions;
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error("Config Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update or fetch project configuration" 
    });
  }
};



export const projectMemberController = async (req, res) => {
  try {
    const { projectId, action, memberIds, role } = req.body;
    const adminUserId = req.user.userId;

    // 1. Permission Check (Must be Admin/Manager level)
    const haveRights = await UserWorkAccess.exists({
      projectId: projectId,
      userId: adminUserId,
      accessType: { $gte: 300 }
    });

    if (!haveRights) {
      return res.status(403).json({ success: false, msg: "Insufficient permissions to manage members." });
    }

    switch (action.toLowerCase()) {

      case "get":
        // 2. Fetch all unique User IDs associated with this project
        const accessRecords = await UserWorkAccess.find({ projectId ,userId:{$ne:null}})
          .select("userId email accessType")
          .lean();

        if (!accessRecords || accessRecords.length === 0) {
          return res.status(404).json({ success: false, msg: "No members found for this project." });
        }

        // 3. Optimized Data Fetching: Get all User details in ONE query
        const userIds = accessRecords.map(record => record.userId).filter(id => id != null);
        const userDetails = await User.find({ _id: { $in: userIds } })
          .select("profile username email")
          .lean();

        // 4. Map details back to the access records
        const membersList = accessRecords.map(record => {
          const detail = userDetails.find(u => u._id.toString() === record.userId?.toString());
          return {
            userId: record.userId,
            email: record.email,
            role: record.accessType,
            details: detail || null
          };
        });

        // 5. Success Response
        return res.status(200).json({
          success: true,
          count: membersList.length,
          members: membersList
        });

      case "update":
        if (!memberIds || memberIds.length === 0) {
          return res.status(400).json({ success: false, msg: "No users specified for update." });
        }
        if (!role) {
          return res.status(400).json({ success: false, msg: "Role (accessType) is required for update." });
        }

        const updateResult = await UserWorkAccess.updateMany(
          { 
            projectId: projectId, 
            userId: { $in: memberIds } 
          },
          { $set: { accessType: role } }
        );

        if (updateResult.modifiedCount > 0) {
          return res.status(200).json({ success: true, msg: `${updateResult.modifiedCount} members updated.` });
        }
        return res.status(404).json({ success: false, msg: "No members were updated. Please check if the users are part of this project." });

      case "delete":
        if (!memberIds || memberIds.length === 0) {
          return res.status(400).json({ success: false, msg: "No users specified for deletion." });
        }

        const deleteResult = await UserWorkAccess.deleteMany({
          projectId: projectId,
          userId: { $in: memberIds }
        });

        if (deleteResult.deletedCount > 0) {
          return res.status(200).json({ success: true, msg: `${deleteResult.deletedCount} members removed.` });
        }
        return res.status(404).json({ success: false, msg: "No members were deleted. Please check if the users are part of this project." });

      default:
        return res.status(400).json({ success: false, msg: "Invalid action specified." });
    }
 
  } catch (error) {
    console.error("projectMemberController Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error during member management." 
    });
  }
};


export const HoraProjectServicesV1 =async(req,res)=>{
  try {
    const {projectId} = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, msg: "Project ID is required." });
    }
    const [horaServices, projectService] = await Promise.all([
      HoraServiceSchema.find({
        isActive:true
      }).lean(),
      ProjectService.find({projectId}).lean()
    ])
    
    console.log(horaServices)
    console.log(projectService)

    const horaServicesForProject= horaServices.map((service)=>{
      const projectServiceRunning = projectService.find((projectService)=>projectService.serviceId === service.serviceId && projectService.isActive === true)
      return {
        ...service,
        isRunning: projectServiceRunning ? true : false
      }
    })
    if (!horaServicesForProject) {
      return res.status(404).json({msg:"No services found !"})
    }

    return res.status(200).json({
      success: true,
      services: horaServicesForProject,
      msg: "Services fetched successfully"
    });
  } catch (error) {
    console.error("HoraProjectServicesV1 Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while fetching services." 
    });
  }
}

export const addSerivceToProjectV1 = async (req, res) => {
  try {
    const { projectId, serviceId } = req.body;
    const adminUserId = req.user.userId;

    // 1. Permission Check (Must be Admin/Manager level)
    const haveRights = await UserWorkAccess.exists({
      projectId: projectId,
      userId: adminUserId,
      accessType: { $gte: 300 }
    });

    if (!haveRights) {
      return res.status(403).json({ success: false, msg: "Insufficient permissions to manage services." });
    }

    // 2. Check if service exists
    const service = await HoraServiceSchema.find({serviceId});
    if (!service) {
      return res.status(404).json({ msg: "No service found!" });
    }

    // 3. Create or update association in ProjectService model
    const projectServiceAssociation = await ProjectService.findOneAndUpdate(
      { projectId, serviceId },
      { 
        projectId, 
        serviceId, 
        isActive: true, 
        status: "ACTIVE", 
        activatedBy: adminUserId 
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      data: projectServiceAssociation,
      msg: "Service added to project successfully"
    });

  } catch (error) {
    console.error("addSerivceToProjectV1 Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while adding service to project." 
    });
  }
}


export const getAllRunningProjectServicebyProjectId = async (req, res) => {
  try {
    const { projectId } = req.query;
    const userId = req.user.userId;

    // 1. Permission Check (Must be Admin/Manager level)
    const haveRights = await UserWorkAccess.exists({
      projectId: projectId,
      userId: userId,
      accessType: { $gte: 300 }
    });
    console.log(haveRights,userId,projectId,"check")
    if (!haveRights) {
      return res.status(403).json({ success: false, msg: "Insufficient permissions to manage services." });
    }

    // 2. Check if service exists
    const service = await ProjectService.find({projectId}).select("serviceId isActive status").lean().populate("service","serviceId name description");
    if (!service) {
      return res.status(404).json({ msg: "No service found!" });
    }

    return res.status(200).json({
      success: true,
      data: service,
      msg: "Service fetched successfully"
    });
  } catch (error) {
    console.error("getAllRunningProjectServicebyProjectId Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while fetching service." 
    });
  }
}

export const updateServiceStatus = async (req, res) => {
  try {
    const { projectId, serviceId, status } = req.body;
    const userId = req.user.userId;

    // 1. Permission Check (Must be Admin/Manager level)
    const haveRights = await UserWorkAccess.exists({
      projectId: projectId,
      userId: userId,
      accessType: { $gte: 300 }
    });

    if (!haveRights) {
      return res.status(403).json({ success: false, msg: "Insufficient permissions to manage services." });
    }

    // 2. Check if service exists
    const service = await ProjectService.findOne({projectId, serviceId});
    if (!service) {
      return res.status(404).json({ msg: "No service found!" });
    }

    // 3. Update service status
    service.status = status ? "ACTIVE" : "INACTIVE";
    service.isActive =status
    await service.save();

    return res.status(200).json({
      success: true,
      data: service,
      msg: "Service status updated successfully"
    });
  } catch (error) {
    console.error("updateServiceStatus Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while updating service status." 
    });
  }
}


//================================ Fetching partner code ===================================

export const checkValidPartnerCode = async (req, res) => {
  try {
    const { partnerCode } = req.body;
    // checking that partner code is valid or not 
    const partner = await PartnerModel.findOne({partnerCode});
    if (!partner) {
      return res.status(404).json({ success: false, msg: "No partner found!" });
    }
    return res.status(200).json({
      success: true,
      data: partner.partnerCode,
      msg: "Partner code checked successfully"
    });
  } catch (error) {
    console.error("checkValidPartnerCode Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while checking partner code." 
    });
  }
}


export const projectInsightController = async(req,res)=>{


  try {
    const {projectId} = req.body;
    const userId=req.user.userId;

    const haveRights = await UserWorkAccess.exists({
      projectId: projectId,
      userId: userId,
      accessType: { $gte: 100 }
    });

    if (!haveRights) {
      return res.status(403).json({ success: false, msg: "Insufficient permissions to manage services." });
    }
    console.log(haveRights,"haveRights")

    const project = await ProjectModel.findOne({projectId});
    if (!project) {
      return res.status(404).json({ success: false, msg: "No project found!" });
    }

    const [projectFlow, tickets, users, allConfig] = await Promise.all([
      ScrumProjectFlow.findOne({ projectId, isActive: true }).lean(),
      TicketModel.find({ projectId }),
      UserWorkAccess.find({ projectId }),
      TicketConfig.findOne({ projectId })
    ]);

    const ticketsData = await Promise.all(tickets.map(async (ticket) => {
      const assignee = await getUserDetailById(ticket.assignee);

      // Handle priorities and labels as they can be arrays in the schema
      const priorityIds = Array.isArray(ticket.priority) ? ticket.priority : [ticket.priority];
      const labelIds = Array.isArray(ticket.labels) ? ticket.labels : [ticket.labels];

      const mappedPriorities = priorityIds
        .map(id => allConfig?.priorities?.find(p => p.id === id))
        .filter(Boolean);

      const mappedLabels = labelIds
        .map(id => allConfig?.labels?.find(l => l.id === id))
        .filter(Boolean);

      return {
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        status: ticket.status,
        assignee: assignee.name,
        assigneeImage: assignee.image,
        reporter: ticket.reporter,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        eta: ticket.eta,
        // Include priority details
        priority: mappedPriorities.length > 0 ? mappedPriorities[0].name : "",
        priorityColor: mappedPriorities.length > 0 ? mappedPriorities[0].color : "#6b7280",
        // Map labels with colors
        labels: mappedLabels.map(l => ({ name: l.name, color: l.color })),
      };
    }));

    // Distribute tasks into board flow columns
    const boardColumns = projectFlow?.columns || [];
    const projectBoardWithTickets = boardColumns.map((column) => {
      const columnTickets = ticketsData.filter(ticket =>
        column.statusKeys.includes(ticket.status)
      );
      return {
        Name: column.name,
        Status: column.statusKeys,
        tickets: columnTickets
      }
    });

    // Group status overview by column names for a cleaner dashboard view
    const taskStatusOverview = boardColumns.reduce((acc, column) => {
      const columnTicketsCount = ticketsData.filter(ticket => 
        column.statusKeys.includes(ticket.status)
      ).length;
      
      acc[column.name] = (acc[column.name] || 0) + columnTicketsCount;
      return acc;
    }, {});
    const teamMemberDetails = await Promise.all(
      users
        .filter(user => user.userId != null)
        .map(async (user) => {
          const details = await getUserDetailById(user.userId);
          return {
            userId: user.userId,
            accessType: user.accessType,
            ...details
          };
        })
    );

    return res.status(200).json({
      success: true,
      data: {
        projectBoard: projectBoardWithTickets,
        taskStatusOverview,
        users: teamMemberDetails,
        project:{projectName:project.projectName}
      }
    });
    
  } catch (error) {
    console.error("projectInsightController Error:", error);
    return res.status(500).json({ 
      success: false, 
      msg: "Internal server error while fetching project insights.",
      error: error.message
    });
  }
}