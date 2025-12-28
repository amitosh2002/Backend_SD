

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
import { accesTypeView, autoCreateDefaultBoardAndFlow, buildDropdownConfigFromFlow, getUserDetailById } from "../../utility/platformUtility.js";
import { TicketModel } from "../../models/TicketModels.js";

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
      email:user.email
    })
    // check user acces for the project
    const userAccess = await UserWorkAccess.findOne({
      partnerId:checkPartner.partnerId
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
      accessType:300,
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
    let board = await SprintBoardConfigSchema.findOne({
      projectId,
      isActive: true,
      workflowSource: "PROJECT",
    }).lean();

    // 2️⃣ Fallback to default board
    if (!board) {
      console.log("[SprintBoard] Project board not found, using default TEMPLATE");
      board = await SprintBoardConfigSchema.findOne({
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
  console.log(userId,"userid ")
  try {
    let { startDate, endDate } = req.query;

    // -------------------------------
    // DEFAULT DATE RANGE (LAST 30 DAYS)
    // -------------------------------
    const now = new Date();

    if (!startDate && !endDate) {
      endDate = now;
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      endDate = endDate ? new Date(endDate) : now;
      startDate = startDate
        ? new Date(startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // const pipeline = [
    //   {
    //     $match: {
    //       $or: [
    //         { assignee: userId },
    //         { "timeLogs.loggedBy": userId }
    //       ]
    //     }
    //   },

    //   {
    //     $addFields: {
    //       filteredTimeLogs: {
    //         $filter: {
    //           input: "$timeLogs",
    //           as: "log",
    //           cond: {
    //             $and: [
    //               { $gte: ["$$log.at", startDate] },
    //               { $lte: ["$$log.at", endDate] },
    //               { $eq: ["$$log.loggedBy", userId] }
    //             ]
    //           }
    //         }
    //       }
    //     }
    //   },

    //   {
    //     $addFields: {
    //       totalTimeLogged: {
    //         $sum: "$filteredTimeLogs.minutes"
    //       }
    //     }
    //   },

    //   {
    //     $lookup: {
    //       from: "Projects",
    //       localField: "projectId",
    //       foreignField: "projectId",
    //       as: "project"
    //     }
    //   },

    //   {
    //     $lookup: {
    //       from: "PartnerSprint",
    //       localField: "sprintId",
    //       foreignField: "sprintId",
    //       as: "sprint"
    //     }
    //   },

    //   { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
    //   { $unwind: { path: "$sprint", preserveNullAndEmptyArrays: true } },

    //   {
    //     $group: {
    //       _id: {
    //         projectId: "$projectId",
    //         sprintId: "$sprintId"
    //       },
    //       projectName: { $first: "$project.name" },
    //       sprintName: { $first: "$sprint.name" },
    //       totalTime: { $sum: "$totalTimeLogged" },
    //       totalStoryPoints: {
    //         $sum: {
    //           $cond: [{ $eq: ["$status", "Done"] }, "$storyPoints", 0]
    //         }
    //       }
    //     }
    //   },

    //   { $sort: { totalTime: -1 } }
    // ];


    const pipeline = [
  {
    $match: {
      $or: [
        { assignee: userId },
        { "timeLogs.loggedBy": userId }
      ]
    }
  },

  {
    $addFields: {
      filteredTimeLogs: {
        $filter: {
          input: "$timeLogs",
          as: "log",
          cond: {
            $and: [
              { $gte: ["$$log.at", startDate] },
              { $lte: ["$$log.at", endDate] },
              { $eq: ["$$log.loggedBy", userId] }
            ]
          }
        }
      }
    }
  },

  {
    $addFields: {
      totalTimeLogged: { $sum: "$filteredTimeLogs.minutes" }
    }
  },

  {
    $lookup: {
      from: "projects",
      let: { ticketProjectId: "$projectId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$projectId", "$$ticketProjectId"] },
                { $eq: [{ $toString: "$projectId" }, { $toString: "$$ticketProjectId" }] },
                 { $eq: [{ $toString: "$_id" }, { $toString: "$$ticketProjectId" }] }
              ]
            }
          }
        }
      ],
      as: "project"
    }
  },

  {

    $lookup: {
      from: "partnersprints",
      let: { ticketSprintId: "$sprint" },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$id", "$$ticketSprintId"] },
                { $eq: [{ $toString: "$id" }, { $toString: "$$ticketSprintId" }] },
                 { $eq: [{ $toString: "$_id" }, { $toString: "$$ticketSprintId" }] }
              ]
            }
          }
        }
      ],
      as: "sprint"
    }
  },

  { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$sprint", preserveNullAndEmptyArrays: true } },

  {

    $project: {
      _id: 1,
      title: 1,
      ticketKey: 1,
      status: 1,
      priority: 1,
      storyPoints: "$storyPoint",
      totalTimeLogged: 1,
      projectId: 1,
      sprintId: 1, // Keep original ID if needed, or mapped one
      projectName: { $ifNull: ["$project.projectName", "$project.name"] },
      sprintName: "$sprint.sprintName",
      timeLogs: "$filteredTimeLogs", // Only return filtered logs or all? Keeping filtered for now as per logic
      // If we want all logs, we should use $timeLogs. But visually filtering usually implies showing relevant logs.
      // However, the UI calculates total time from these logs.
      createdAt: 1,
      updatedAt: 1
    }
  },

  {
    $group: {
      _id: {
        projectId: "$projectId",
        sprintId: "$sprintId"
      },
      projectName: { $first: "$projectName" },
      sprintName: { $first: "$sprintName" },
      // Collect tickets in this sprint
      tickets: {
        $push: {
          _id: "$_id",
          title: "$title",
          ticketKey: "$ticketKey",
          status: "$status",
          priority: "$priority",
          storyPoints: "$storyPoints",
          assignee: "$assignee",
          totalTimeAdded:"$timeLogs",
          totalTimeLogged: "$totalTimeLogged",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt"
        }
      },
      totalTimeSprint: { $sum: "$totalTimeLogged" },
      totalStoryPointsSprint: {
         $sum: {
           $cond: [
             { $eq: ["$status", "Done"] },
             { $ifNull: ["$storyPoints", 0] },
             0
           ]
         }
      }
    }
  },
  
  {
    $group: {
      _id: "$_id.projectId",
      projectName: { $first: "$projectName" },
      sprints: {
        $push: {
          sprintId: "$_id.sprintId",
          sprintName: "$sprintName",
          totalTime: "$totalTimeSprint",
          totalStoryPoints: "$totalStoryPointsSprint",
          tickets: "$tickets"
        }
      },
       totalTimeProject: { $sum: "$totalTimeSprint" }
    }
  },
  
  { $sort: { totalTimeProject: -1 } }
];

    const data = await TicketModel.aggregate(pipeline);

    res.status(200).json({
      success: true,
      meta: {
        startDate,
        endDate
      },
      data
    });
  } catch (err) {
    console.error("User analytics error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

