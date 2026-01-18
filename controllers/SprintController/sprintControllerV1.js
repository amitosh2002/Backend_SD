// import PartnerSprint from "../models/partnerSprint.model.js";

import ActivityLog from "../../models/PlatformModel/ActivityLogModel.js";
import { LogActionType, LogEntityType } from "../../models/PlatformModel/Enums/ActivityLogEnum.js";
import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../../models/PlatformModel/SprintModels/partnerSprint.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import { getAppSprintAnalytics, getSprintContext } from "../../utility/platformUtility.js";

// CREATE SPRINT
export const createSprint = async (req, res) => {
  try {
    const { projectId, startDate, endDate, sprintName } = req.body;

    /* ================================
       1️⃣ Basic Validation
    ================================= */
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // if (typeof sprintName !== "string") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid sprint name",
    //   });
    // }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    /* ================================
       2️⃣ Check Project Exists
    ================================= */
    const projectDetails = await ProjectModel.findOne({ projectId });

    if (!projectDetails) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    if (projectDetails?.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Cannot create sprint for archived project",
      });
    }

    /* ================================
       3️⃣ Duplicate Sprint Name
    ================================= */
    const duplicateSprint = await partnerSprint.findOne({
      projectId,
      sprintName: { $regex: `^${sprintName}$`, $options: "i" },
    });

    if (duplicateSprint) {
      return res.status(409).json({
        success: false,
        message: "Sprint name already exists in this project",
      });
    }

    /* ================================
       4️⃣ Overlapping Sprint Check
    ================================= */
    const overlappingSprint = await partnerSprint.findOne({
      projectId,
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlappingSprint) {
      return res.status(409).json({
        success: false,
        message: "Sprint dates overlap with an existing sprint",
      });
    }

    /* ================================
       5️⃣ Check Active Sprint
    ================================= */
    const activeSprintExists = await partnerSprint.exists({
      projectId,
      isActive: true,
    });

    /* ================================
       6️ Create Sprint (Atomic)
    ================================= */
    const sprint = await partnerSprint.create({
      partnerId: projectDetails.partnerId,
      projectId,
      sprintName: sprintName ??  "",
      startDate: start,
      endDate: end,
      isActive: !activeSprintExists,
      status: !activeSprintExists ? "ACTIVE" : "PLANNED",
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Sprint created successfully",
      sprint,
    });
  } catch (error) {
    console.error("Error creating sprint:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getSprintForProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    const sprintContext = await getSprintContext(projectId);

    if (!sprintContext) {
      return res.status(404).json({
        success: false,
        message: "No active sprint found for this project",
      });
    }

    const { current, previous, next } = sprintContext;

    return res.status(200).json({
      success: true,
      currentSprint: current && {
        id: current.id,
        sprintName: current.sprintName,
        sprintNumber: current.sprintNumber,
        startDate: current.startDate,
        endDate: current.endDate,
        isActive: current.isActive,
        status: current.isActive ? "active" : "completed",
      },
      previousSprint: previous
        ? {
            id: previous.id,
            sprintName: previous.sprintName,
            sprintNumber: previous.sprintNumber,
            startDate: previous.startDate,
            endDate: previous.endDate,
            status:previous.isActive ? "active" : "completed"
          }
        : null,
      nextSprint: next
        ? {
            id: next.id,
            sprintName: next.sprintName,
            sprintNumber: next.sprintNumber,
            startDate: next.startDate,
            endDate: next.endDate,
            status:next.isActive ? "active" : "planned"

          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching sprint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSprintsForPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: "partnerId is required",
      });
    }

    const sprints = await partnerSprint.find({ partnerId }).sort({
      projectId: 1,
      sprintNumber: 1,
    });

    return res.status(200).json({
      success: true,
      count: sprints.length,
      sprints,
    });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;

    // 🔥 FIX: extract nested updates
    const updates = { ...req.body.updates };

    // 🔒 Block protected fields
    delete updates.isActive;
    delete updates.sprintNumber;
    delete updates.projectId;
    delete updates.partnerId;

    // ✅ name → sprintName
    if (updates.name) {
      updates.sprintName = updates.name;
      delete updates.name;
    }

    // ✅ Convert dates
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const sprint = await partnerSprint.findOneAndUpdate(
      { id: sprintId },          // UUID
      { $set: updates },        
      { new: true, runValidators: true }
    );


    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    return res.status(200).json({
      success: true,
      sprint,
    });
  } catch (error) {
    console.error("Error updating sprint:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deactivateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await partnerSprint.findOne({ id: sprintId });

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    if (!sprint.isActive) {
      return res.status(400).json({
        success: false,
        message: "Sprint already inactive",
      });
    }

    sprint.isActive = false;
    sprint.endDate= new Date()
    sprint.status="COMPLETED";
    await sprint.save();

    return res.status(200).json({
      success: true,
      message: "Sprint deactivated successfully",
      sprint,
    });
  } catch (error) {
    console.error("Error deactivating sprint:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


export const assignSprintToProjectTicket = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { ticketId } = req.body;

    console.log(sprintId,ticketId)

    if (!ticketId) {
      return res.status(400).json({ success: false, message: "ticketId is required" });
    }

    const sprint = await partnerSprint.findOne({ id: sprintId });
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    // check for validation of sprint dates
    let currentDate = new Date();
    if (sprint.startDate > currentDate) {
      return res.status(400).json({ success: false, message: "Cannot assign ticket to a sprint that has not started yet" });
    }
    if (sprint.endDate <currentDate) {
      return res.status(400).json({ success: false, message: "Cannot assign ticket to a sprint that has completed" });
    }
    // fetching the ticket to be assigned
    const project = await TicketModel.findById({ _id:ticketId });
    if(!project){
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    await TicketModel.findByIdAndUpdate(ticketId, { sprint: sprint.id });

   await ActivityLog.create(
      {
        userId:req.user.userId,
        projectId:project.projectId,
        actionType:LogActionType.SPRINT_UPDATE,
        targetType:LogEntityType.SPRINT,
        targetId:ticketId?? project._id,
        changes:{
          newValue:sprint.sprintName,
        },
      }
    )
    // sprint.projectId = projectId;
    // await sprint.save();
    return res.status(200).json({ success: true, message: `Ticket moved to ${sprint?.sprintName || 'Backlog'}` });
      
  } catch (error) {
    console.error("Error assigning sprint to project:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
export const getProjectSprintOverview = async (req, res) => {
  console.log("✅ CONTROLLER HIT");
  console.log("QUERY PARAMS:", req.query);

  const userId = req.user.userId;

  try {
    const { projectId } = req.query;

    let projectIds = [];

    if (projectId) {
      // Specific project requested
      console.log("enter the if")
      projectIds = [projectId];
    } else {
      // Fetch all projects user has access to
      const accesses = await UserWorkAccess.find({
        userId,
        accessType: { $gte: 300 },
        status: "accepted",
      }).lean();

      if (!accesses.length) {
        return res.json({
          success: true,
          count: 0,
          userId,
          projects: [],
        });
      }

      projectIds = [...new Set(accesses.map(a => a.projectId.toString()))];
    }
    console.log(projectIds,"list ")
    const allProjectSprints = [];

    // Loop through each project
    for (const pid of projectIds) {
      // Fetch all sprints for the project
      const sprints = await partnerSprint.find({ projectId: pid, })
        .sort({ sprintNumber: 1 })
        .lean();

      if (!sprints.length) {
        // If no sprints, return empty array for this project
        allProjectSprints.push({
          projectId: pid,
          sprints: [],
        });
        continue;
      }

      const sprintData = [];

      // Fetch analytics for each sprint
      for (const sprint of sprints) {
        try {
          const analytics = await getAppSprintAnalytics(sprint.id);

          sprintData.push({
            sprintId: sprint.id,
            sprintName: sprint.sprintName,
            sprintNumber: sprint.sprintNumber,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status,
            isActive: sprint.isActive,
            analytics,
          });
        } catch (err) {
          console.error(`Failed to get analytics for sprint ${sprint.id}:`, err.message);
          // Still push sprint details without analytics if helper fails
          sprintData.push({
            sprintId: sprint.id,
            sprintName: sprint.sprintName,
            sprintNumber: sprint.sprintNumber,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status,
            isActive: sprint.isActive,
            analytics: null,
          });
        }
      }

      allProjectSprints.push({
        projectId: pid,
        sprints: sprintData,
      });
    }

    return res.json({
      success: true,
      count: allProjectSprints.length,
      projects: allProjectSprints,
    });
  } catch (error) {
    console.error("Error in getProjectSprintOverview:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const startSprintManually = async (req, res) => {
  try {
    const { sprintId } = req.body;

    if (!sprintId) {
      return res.status(400).json({
        success: false,
        message: "sprintId is required"
      });
    }

    // 1️⃣ Find the sprint to start
    const sprintToStart = await partnerSprint.findOne({ id: sprintId });

    if (!sprintToStart) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found"
      });
    }

    const { projectId } = sprintToStart;

    // 2️⃣ Complete any active sprint in the same project
    await partnerSprint.updateMany(
      {
        projectId,
        isActive: true,
        status:{$ne:"PLANNED"},
        id: { $ne: sprintId } // do not complete the same sprint
      },
      {
        $set: {
          isActive: false,
          status: "COMPLETED",
          endDate: new Date()
        }
      }
    );

    // 3️⃣ Start the selected sprint
    const startedSprint = await partnerSprint.findOneAndUpdate(
      { id: sprintId },
      {
        $set: {
          isActive: true,
          status: "ACTIVE",
          startDate: new Date()
        }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Sprint started successfully",
      sprint: startedSprint
    });

  } catch (error) {
    console.error("Error starting sprint:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
