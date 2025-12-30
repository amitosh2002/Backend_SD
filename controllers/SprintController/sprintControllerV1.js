// import PartnerSprint from "../models/partnerSprint.model.js";

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
    const updates = req.body;

    // ❌ Block manual isActive update
    delete updates.isActive;
    delete updates.sprintNumber;
    delete updates.projectId;
    delete updates.partnerId;

    const sprint = await PartnerSprint.findOneAndUpdate(
      { id: sprintId },
      updates,
      { new: true }
    );

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    return res.status(200).json({ success: true, sprint });
  } catch (error) {
    console.error("Error updating sprint:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
export const deactivateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await PartnerSprint.findOne({ id: sprintId });

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
      projectIds = [projectId];
    } else {
      // Fetch all projects user has access to
      const accesses = await UserWorkAccess.find({
        userId,
        accessType: { $gte: 200 },
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

      projectIds = [...new Set(accesses.map(a => a.projectId?.toString().trim()).filter(id => !!id))];
    }

    // NEW: Cross-verify with ProjectModel to remove orphaned IDs
    const validProjects = await ProjectModel.find({ projectId: { $in: projectIds } }).select('projectId projectName name').lean();
    const projectMap = new Map(validProjects.map(p => [p.projectId, p.projectName || p.name || "Unknown Project"]));
    
    // Update projectIds to only include those that actually exist
    projectIds = validProjects.map(p => p.projectId);

    const allProjectSprints = [];

    // Loop through each project
    for (const pid of projectIds) {
      // Fetch all sprints for the project
      const sprints = await partnerSprint.find({ projectId: pid })
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

      // NEW: Get project name from our validated map
      const pName = projectMap.get(pid) || "Unknown Project";

      // Fetch analytics and tickets for each sprint
      for (const sprint of sprints) {
        try {
          const analytics = await getAppSprintAnalytics(sprint.id);

          // NEW: Fetch tickets for this sprint that have an ETA
          const ticketsWithEta = await TicketModel.find({
            sprint: sprint.id,
            eta: { $exists: true, $ne: null }
          }).select('title eta status ticketKey type').lean();

          sprintData.push({
            sprintId: sprint.id,
            sprintName: sprint.sprintName,
            projectName: pName, // Include project name
            sprintNumber: sprint.sprintNumber,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status,
            isActive: sprint.isActive,
            analytics,
            tickets: ticketsWithEta // Include relevant tickets
          });
        } catch (err) {
          console.error(`Failed to get data for sprint ${sprint.id}:`, err.message);
          
          const ticketsWithEta = await TicketModel.find({
            sprint: sprint.id,
            eta: { $exists: true, $ne: null }
          }).select('title eta status ticketKey type').lean();

          sprintData.push({
            sprintId: sprint.id,
            sprintName: sprint.sprintName,
            projectName: pName, // Include project name
            sprintNumber: sprint.sprintNumber,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status,
            isActive: sprint.isActive,
            analytics: null,
            tickets: ticketsWithEta
          });
        }
      }

      allProjectSprints.push({
        projectId: pid,
        projectName: pName,
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

