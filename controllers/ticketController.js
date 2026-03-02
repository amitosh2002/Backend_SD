import { TicketModel } from "../models/TicketModels.js";
import User from "../models/UserModel.js";
import   {UserWorkAccess} from "../models/PlatformModel/UserWorkAccessModel.js";
import mongoose from "mongoose";
import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../models/PlatformModel/SprintModels/partnerSprint.js";
import ActivityLog from "../models/PlatformModel/ActivityLogModel.js";
import { LogActionType, LogEntityType } from "../models/PlatformModel/Enums/ActivityLogEnum.js";
import { getCleanUniqueItems, getProjectFlowWithFallback, getUserDetailById } from "../utility/platformUtility.js";
import ScrumProjectFlow from "../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { TicketConfig } from "../models/PlatformModel/TicketUtilityModel/TicketConfigModel.js";
import { config } from "dotenv";

export const createTicket = async (req, res) => {
  try {
    const {
      title,
      type,
      priority,
      reporter,
      assignee,
      branch,
      timeLog,
      description,
      storyPoint,
      reviewDocument,
      ticketLog,
    } = req.body;
    if (!title || !type) {
      return res
        .status(400)
        .json({ message: "'title' and 'type' are required" });
    }
    const ticket = new TicketModel({
      title,
      type,
      priority,
      reporter,
      assignee,
      branch,
      timeLog,
      storyPoint,
      reviewDocument,
      ticketLog,
      description
    });
    await ticket.save();
    return res.status(201).json(ticket);
  } catch (err) {
    console.error("Error creating ticket:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createTicketV2 = async (req, res) => {
  try {
    const ticketData = req.body;
    const userId =  req.user.userId || req.body.userId;
    console.log(ticketData)    
    // const userId = req.body.userId || (req.user && req.user.userId);
    if (!userId) return res.status(401).json({ message: 'Missing userId or unauthenticated' });
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Basic validation
    if (!ticketData.title || !ticketData.type) {
      return res.status(400).json({
        success: false,
        message: "'title' and 'type' are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }
  // let priority = (ticketData?.priority || '').toString().toUpperCase();
    // console.log(priority)
    // Optional: Sanitize and set defaults
    const sanitizedData = {
      // Set defaults if not provided
      title:ticketData?.title,
      description:ticketData?.description,
      type: ticketData?.type?.type || ticketData?.type,
      priority: ticketData?.priority || 'MEDIUM',
      status: ticketData?.status || 'OPEN',
      // Add reporter from authenticated user if not provided
      reporter: ticketData?.reporter  || user?.username,
      assignee: ticketData?.assignee || "Unassigned",
      // Add timestamps
      createdBy: user?.userId,
      storyPoint: ticketData?.storyPoints || ticketData?.storyPoint || 0,
      labels: ticketData?.labels || [],
      eta: ticketData?.dueDate ? new Date(ticketData.dueDate).toISOString() : null,
      projectId: ticketData?.projectId,
      parentTicket: ticketData?.parentTicket || null,
      // Remove any undefined or null values
    };

    // Remove undefined/null values (but keep null for parentTicket if explicit)
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] === undefined) {
        delete sanitizedData[key];
      }
    });

    const ticket = new TicketModel(sanitizedData);
    // If projectId is provided, derive partnerId from the ProjectModel and set it server-side
    if (sanitizedData.projectId) {
      const project = await ProjectModel.findOne({ projectId: sanitizedData.projectId }).lean();
      if (!project) {
        return res.status(400).json({ success: false, message: 'Invalid projectId provided' });
      }
      ticket.partnerId = project.partnerId;
    }

    await ticket.save();


    // adding logs for ticket creation 

    await ActivityLog.create(
      {
        userId:userId,
        projectId:ticket.projectId,
        actionType:LogActionType.TICKET_CREATE,
        targetType:LogEntityType.TASK,
        targetId:ticket.id ?? ticket._id,
        changes:{
          newValue:ticket.ticketKey,
        },
      }
    )

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: {
        id: ticket._id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        type: ticket?.type,
        status: ticket.status,
        priority: ticket.priority,
        reporter: ticket.reporter,
        assignee: ticket.assignee,
        createdAt: ticket.createdAt,
        // Include other relevant fields
        ...ticket.toObject()
      }
    });
  } catch (err) {
    console.error("Error creating ticket:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        code: "VALIDATION_ERROR",
        errors: Object.keys(err.errors).reduce((acc, key) => {
          acc[key] = err.errors[key].message;
          return acc;
        }, {})
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate ticket key",
        code: "DUPLICATE_KEY"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
};



export const listTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      assignee,
      project,
      reporter,
      labels,
      priority,
      ticketConvention, // maps to TicketModel.type
      sort = "createdAt",
      sprint,
      partnerId,
    } = req.query;

    const userId = req.user.userId;

    const numericLimit = Math.min(Math.max(+limit || 20, 1), 200);
    const numericPage = Math.max(+page || 1, 1);

    /* ---------------------------------------------
       1️⃣ Fetch user access (lean + projection)
    --------------------------------------------- */
    const accessList = await UserWorkAccess.find(
      { userId, status: "accepted" },
      { projectId: 1, partnerId: 1 }
    ).lean();

    if (!accessList.length) {
      return res.status(200).json({
        page: numericPage,
        limit: numericLimit,
        total: 0,
        items: [],
        accessibleProjects: [],
        accessiblePartners: [],
      });
    }

    const allowedProjectIds = new Set(
      accessList.map(a => String(a.projectId)).filter(Boolean)
    );

    const allowedPartnerIds = new Set(
      accessList.map(a => String(a.partnerId)).filter(Boolean)
    );

    /* ---------------------------------------------
       2️⃣ Helpers
    --------------------------------------------- */
    const buildInQuery = (val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return { $in: val };
      if (typeof val === "string" && val.includes(",")) {
        return { $in: val.split(",").map(v => v.trim()) };
      }
      return val;
    };

    const normalizeProjectIds = (ids) =>
      ids.map(id =>
        mongoose.Types.ObjectId.isValid(id) && id.length === 24
          ? new mongoose.Types.ObjectId(id)
          : id
      );

    /* ---------------------------------------------
       3️⃣ Build Filters
    --------------------------------------------- */
    const filters = {};

    if (status) filters.status = buildInQuery(status);
    if (priority) filters.priority = priority;
    if (assignee) filters.assignee = buildInQuery(assignee);
    if (reporter) filters.reporter = reporter;

    // 🔹 Labels (array field → $in)
    if (labels) {
      const labelQuery = buildInQuery(labels);
      if (labelQuery?.$in) {
        filters.labels = { $in: labelQuery.$in };
      } else {
        filters.labels = labels;
      }
    }
//     if (labels) {
//   const labelQuery = buildInQuery(labels);
//   const values = labelQuery?.$in ?? [labels];

//   filters.$or = [
//     { 'labels.id': { $in: values } },
//     { 'labels.name': { $in: values } },
//   ];
// }


    // 🔹 Ticket type / convention
    if (ticketConvention) {
      filters.type = buildInQuery(ticketConvention);
    }

    if (sprint) {
      filters.sprint = buildInQuery(sprint);
    }

    /* ---------------------------------------------
       4️⃣ Project Access Filter
    --------------------------------------------- */
    if (project) {
      const requested = project.split(",").map(String);
      const allowed = requested.filter(id =>
        allowedProjectIds.has(id)
      );

      if (!allowed.length) {
        return res.status(403).json({
          message: "Access denied for selected project(s)",
        });
      }

      filters.projectId = {
        $in: normalizeProjectIds(allowed),
      };
    } else if (allowedProjectIds.size) {
      filters.projectId = {
        $in: normalizeProjectIds([...allowedProjectIds]),
      };
    }

    /* ---------------------------------------------
       5️⃣ Partner Access Filter
    --------------------------------------------- */
    if (partnerId) {
      if (!allowedPartnerIds.has(String(partnerId))) {
        return res.status(403).json({
          message: "Access denied for this partner",
        });
      }
      filters.partnerId = String(partnerId);
    } else if (allowedPartnerIds.size) {
      filters.partnerId = { $in: [...allowedPartnerIds] };
    }

    /* ---------------------------------------------
       6️⃣ Query (parallel + lean)
    --------------------------------------------- */
    const skip = (numericPage - 1) * numericLimit;

    const [items, total] = await Promise.all([
      TicketModel.find(filters)
        .sort({ [sort]: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),

      TicketModel.countDocuments(filters),
    ]);

    /* ---------------------------------------------
       7️⃣ Sprint name hydration (batched)
    --------------------------------------------- */
    const sprintIds = [...new Set(items.map(t => t.sprint).filter(Boolean))];

    if (sprintIds.length) {
      const sprints = await partnerSprint
        .find({ id: { $in: sprintIds } }, { id: 1, sprintName: 1 })
        .lean();

      const sprintMap = Object.fromEntries(
        sprints.map(s => [s.id, s.sprintName])
      );

 
    }

    // update the assignee details with name and keep ID
    await Promise.all(
      items.map(async (ticket) => {
        const user = await getUserDetailById(ticket?.assignee);
        const config = await TicketConfig.findOne({ projectId: ticket?.projectId });
        const project = await ProjectModel.findOne({ projectId: ticket?.projectId });
        
        ticket.type = config?.conventions.find((convention) => convention.id === ticket.type)?.name;
        ticket.assigneeId = ticket.assignee; // Keep the original ID
        ticket.assignee = user?.name || "Unassigned";
        ticket.assigneeImage = user?.image || null;
        const reporterUser = await User.findOne({ username: ticket.reporter }).select("profile").lean();
        ticket.reporterImage = reporterUser?.profile?.avatar || null;
        ticket.projectName = project?.projectName;
        ticket.isGithubConnected = project?.isGithubConnected || false;
      })
    );


    /* ---------------------------------------------
       8️⃣ Response
    --------------------------------------------- */
    return res.status(200).json({
      page: numericPage,
      limit: numericLimit,
      total,
      items,
      accessibleProjects: [...allowedProjectIds],
      accessiblePartners: [...allowedPartnerIds],
    });

  } catch (err) {
    console.error("❌ Error listing tickets:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Use .lean() to get a plain JS object (faster & mutable)
    // 2. Use .populate if your schema allows it
    const ticket = await TicketModel.findById(id).lean();

    // 3. Early return if ticket doesn't exist
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // 4. Fetch user details only after confirming ticket exists
    if (ticket.assignee) {
      const user = await getUserDetailById(ticket.assignee);
      ticket.assigneeId = ticket.assignee; // Preserve original ID
      ticket.assignee = user?.name || "Unassigned";
      ticket.assigneeImage = user?.image || null;
    }
    const reporterUser = await User.findOne({ username: ticket.reporter }).select("profile").lean();
    ticket.reporterImage = reporterUser?.profile?.avatar || null;

    // Hydrate project details
    if (ticket.projectId) {
      const project = await ProjectModel.findOne({ projectId: ticket.projectId }).lean();
      if (project) {
        ticket.projectName = project.projectName;
        ticket.isGithubConnected = project.isGithubConnected || false;
      }
    }

    return res.status(200).json(ticket);
  } catch (err) {
    console.error("Error getting ticket:", err); // Keep logging for debugging
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    // prevent overriding immutable sequence fields
    delete update.sequenceNumber;
    delete update.ticketKey;
    const updated = await TicketModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

        await ActivityLog.create(
      {
        userId:req.user.userId,
        projectId:updated.projectId,
        actionType:LogActionType.TICKET_UPDATE,
        targetType:LogEntityType.TASK,
        targetId:id,
        changes:{
          newValue:updated.ticketKey,
        },
      }
    )
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating ticket:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Assuming TicketModel is imported
export const addTimeLog = async (req, res) => {
  try {
    const { 
      ticketId,        // The ID of the ticket to update
      durationSeconds, // The total time logged, in seconds (from client conversion)
      note,            // The description of the work
     
    } = req.body;
    const userId = req.user.userId;

    // --- Input Validation ---
    
    // Check for required fields
    if (!ticketId || durationSeconds == null || !userId) {
      return res.status(400).json({ 
        message: "Missing required fields: ticketId, durationSeconds, or loggedBy." 
      });
    }

    // Check for valid duration (must be a non-negative number)
    if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
      // Adjusted the validation to match the new durationSeconds field
      return res.status(400).json({ 
        message: "'durationSeconds' must be a non-negative number." 
      });
    }
    
    // Convert seconds back to minutes for your existing schema (if 'minutes' is still the field name)
    // If you intend to store seconds, you must update your Mongoose subdocument schema.
    const durationMinutes = Math.round(durationSeconds / 60);

    // 2. Update the Ticket Document
    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        $push: { 
          timeLogs: { 
            // 💡 Using durationMinutes to fit your original schema field 'minutes'
            minutes: durationMinutes, 
            note, 
            loggedBy:userId 
          } 
        } ,
         $inc: { totalTimeLogged: durationMinutes } // Targets the new top-level field
      },
      { new: true, runValidators: true }
    );

    // ====================== logs for timelog===============/
       await ActivityLog.create(
      {
        userId:req.user.userId,
        projectId:updatedTicket.projectId,
        actionType:LogActionType.ADD_TIME_LOG,
        targetType:LogEntityType.TASK,
        targetId:ticketId,
        changes:{
          newValue:durationMinutes,
        },
      })

    // 3. Handle Not Found
    if (!updatedTicket) {
      return res.status(404).json({ message: `Ticket with ID ${ticketId} not found.` });
    }

    // 4. Success Response
    return res.status(200).json(updatedTicket);
    
  } catch (err) {
    console.error("Error adding time log:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // const updated = await TicketModel.findByIdAndUpdate(
    //   id,
    //   { status },
    //   { new: true, runValidators: true }
    // );

    const ticket = await TicketModel.findById(id);

    const prevStatus = ticket.status;
 
    ticket.status = status;
    await ticket.save();

      await ActivityLog.create({
        userId: req.user.userId,
        projectId: ticket.projectId,
        actionType: LogActionType.TICKET_TRANSITION,
        targetType: LogEntityType.TASK,
        targetId: ticket._id,
        changes: 
          {
            field: 'status',
            prevValue: prevStatus,
            newValue: status,
          },
        
      });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json({msg:"ticket status updated"});
  } catch (err) {
    console.error("Error setting status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unassignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    // const updated = await TicketModel.findByIdAndUpdate(
    //   id,
    //   { status },
    //   { new: true, runValidators: true }
    // );

    const ticket = await TicketModel.findByIdAndUpdate(id, { assignee:"Unassigned" });

  
 
 
    await ticket.save();

      await ActivityLog.create({
        userId: req.user.userId,
        projectId: ticket.projectId,
        actionType: LogActionType.TICKET_UNASSIGN,
        targetType: LogEntityType.TASK,
        targetId: ticket._id,
        changes: 
          {
            field: 'assignee',
            prevValue: ticket.assignee,
            newValue: "Unassigned",
          },
        
      });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json({msg:"ticket status updated"});
  } catch (err) {
    console.error("Error setting status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Assuming TicketModel and User model are imported
export const setAssignee = async (req, res) => {
    try {
        const ticketId = req.params.id;
        // Use userId from body if assigning others, fallback to current user for "Assign to me"
        const assigneeId = req.body.userId || req.user.userId;

        // ... (Input Validation remains the same) ...
        if (!assigneeId || !ticketId) {
            return res.status(400).json({ success: false, message: "Missing ticket ID or user ID (assignee)." });
        }

        // --- Find Assignee Details ---

        // if (!assigneeDetails) {
        //     return res.status(404).json({ success: false, message: `User with ID ${userId} not found.` });
        // }

        // 💡 FIX 2: Check the property on the User model. It's usually '_id' for reference.
        // Assuming your TicketModel 'assignee' field is of type { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        const updatedTicket = await TicketModel.findByIdAndUpdate(
            ticketId,
            { 
                // 💡 CRITICAL FIX: Save the user's MongoDB ID for proper referencing/population
                assignee: assigneeId 
            },
            { new: true, runValidators: true }
        ).populate('assignee', 'username profile email');
        

        if (!updatedTicket) {
            return res.status(404).json({ success: false, message: `Ticket with ID ${ticketId} not found.` });
        }

        // adding log 
          await ActivityLog.create({
        userId: req.user.userId,
        projectId: updatedTicket.projectId,
        actionType: LogActionType.TICKET_ASSIGN,
        targetType: LogEntityType.TASK,
        targetId: updatedTicket._id,
        changes: 
          {
            field: 'assignee',
            prevValue: "",
            newValue: updatedTicket.ticketKey,
          },
        
      });
        // Success
        return res.status(200).json({ success: true, ticket: updatedTicket });
    } catch (err) {
        console.error("Error setting assignee:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const setPriority = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { priorityId } = req.body;

    if (!priorityId) {
      return res.status(400).json({ message: "priorityId is required" });
    }

    // 1️⃣ Fetch ticket (minimal fields)
    const ticket = await TicketModel.findById(ticketId)
      .select("projectId priority")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // 2️⃣ Skip if already assigned
    if (ticket.priority === priorityId) {
      return res.status(200).json({ message: "Priority already assigned" });
    }

    // 3️⃣ Validate priority exists in TicketConfig
    const project = await TicketConfig.findOne(
      {
        projectId: ticket.projectId,
        "priorities.id": priorityId,
      },
      { "priorities.$": 1 }
    ).lean();

    if (!project || !project.priorities?.length) {
      return res.status(404).json({
        message: "Priority not found in project config",
      });
    }

    // 4️⃣ Assign priority (store ONLY id)
    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { priority: priorityId },
      { new: true }
    );

    return res.status(200).json(updatedTicket);

  } catch (err) {
    console.error("❌ Error setting priority:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addLabel = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { labelId } = req.body;

    if (!labelId) {
      return res.status(400).json({ message: "labelId is required" });
    }

    // 1️⃣ Fetch ticket (minimal fields)
    const ticket = await TicketModel.findById(ticketId)
      .select("projectId labels")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // 2️⃣ Prevent duplicate label (simple + fast)
    if (ticket.labels?.includes(String(labelId))) {
      return res.status(200).json({ message: "Label already assigned" });
    }

    // 3️⃣ Validate label belongs to this project
    const labelExists = await TicketConfig.exists({
      projectId: ticket.projectId,
      "labels.id": labelId,
    });

    if (!labelExists) {
      return res.status(404).json({
        message: "Label not found for this project",
      });
    }

    // 4️⃣ Add labelId only (no duplicates guaranteed)
    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { $addToSet: { labels: String(labelId) } },
      { new: true }
    ).lean();

    return res.status(200).json(updatedTicket);

  } catch (err) {
    console.error("❌ Error adding label:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body;
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { $pull: { labels: label } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error removing label:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTicketByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const ticket = await TicketModel.findOne({ ticketKey: key });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(ticket);
  } catch (err) {
    console.error("Error getting ticket by key:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const previewTicketKey = async (req, res) => {
  console.log("[previewTicketKey] Request query:", JSON.stringify(req.query));
  try {
    const { type, title, projectId } = req.query;
    if (!type || !title || !projectId) {
      console.warn("[previewTicketKey] Missing required fields");
      return res
        .status(400)
        .json({ message: "'type', 'title', and 'projectId' are required" });
    }
    const key = await TicketModel.getNextTicketKey(projectId, type, title);
    console.log("[previewTicketKey] Previewed key:", key);
    return res.status(200).json({ key });
  } catch (err) {
    console.error("[previewTicketKey] Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


/**
 * Searches for tickets based on a text query, filtered by optional project/partner context.
 * Improves performance by only searching when a query is present and using proper indexing.
 * @param {object} req - Express request object (expects req.query.q, req.query.partnerId, req.query.projectId)
 * @param {object} res - Express response object
 */
export const getTicketByQuery = async (req, res) => {
    // 1. Destructure and Clean '
    console.log(req.user.userId)
    const { query } = req.query;
    console.log(req.query,"search query")
    // const { q, partnerId, projectId } = req.query;

    // Check if the mandatory search term 'q' is missing or empty
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ 
            message: "Search query 'q' is required." 
        });
    }

    try {
        // 2. Build the MongoDB Query Object
        const mongoQuery = {};

        // A. Full-Text Search Condition ($or)
        // Ensure the query term is properly escaped for regex if necessary, 
        // but $regex handles most simple cases.
        const searchRegex = new RegExp(query, 'i'); 

        mongoQuery.$or = [
            { title: { $regex: searchRegex } },
            // Assuming description is string/object. If it's a rich object, full-text indexing is better.
            { description: { $regex: searchRegex } }, 
            { ticketKey: { $regex: searchRegex } }
        ];

        // // B. Hierarchical Filtering (Security/Context)
        // // CRITICAL: Filter tickets by the required Partner and Project IDs.
    //  ⁡⁢⁣⁣ // 𝘄𝗵𝗲𝗻 𝗶𝗽𝗮𝗿𝘁𝗻𝗲𝗿 𝗯𝗼𝗮𝗿𝗱 𝗰𝗼𝗺𝗲𝘀 𝘁𝗵𝗲𝗻 𝗶𝘁 𝘄𝗶𝗹𝗹 𝘂𝘀𝗲𝗱⁡
        // if (partnerId) {
        //     // Mongoose will automatically cast to ObjectId if the field type is set correctly
        //     mongoQuery.partnerId = partnerId; 
        // }

        // if (projectId) {
        //     mongoQuery.projectId = projectId;
        // }
    //  ⁡⁢⁣⁣ // 𝘄𝗵𝗲𝗻 𝗶𝗽𝗮𝗿𝘁𝗻𝗲𝗿 𝗯𝗼𝗮𝗿𝗱 𝗰𝗼𝗺𝗲𝘀 𝘁𝗵𝗲𝗻 𝗶𝘁 𝘄𝗶𝗹𝗹 𝘂𝘀𝗲𝗱⁡

    

        // 3. Execute the Query
        // Add a .limit() and .skip() for pagination in a production environment

        const userWorkAccess = await UserWorkAccess.find({ userId: req.user.userId });
        const projectIds = userWorkAccess.map(userWorkAccess => userWorkAccess.projectId);
        mongoQuery.projectId = { $in: projectIds };
        const tickets = await TicketModel.find(mongoQuery)
            .select('ticketKey title status priority partnerId projectId') // Select only essential fields
            .limit(50) // Prevent fetching too many documents on a broad query
            .sort({ createdAt: -1 }); // Show latest matches first

        // 4. Handle Results
        if (!tickets || tickets.length === 0) {
            return res.status(404).json({ message: "No tickets found matching your search criteria." });
        }

        // Optionally populate partner/project names if needed by the frontend:
        /*
        const populatedTickets = await TicketModel.populate(tickets, [
            { path: 'partnerId', select: 'name' },
            { path: 'projectId', select: 'name' }
        ]);
        return res.status(200).json(populatedTickets);
        */
       const resultTicket = tickets.map(ticket => ({
        id: ticket._id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
       }))

        return res.status(200).json({
          succcess:true,
          resultTicket:resultTicket,
          total: resultTicket.length
        });
    } catch (err) {
        console.error("Error getting tickets by query:", err);
        // Better error message if the ID format is invalid
        if (err.name === 'CastError') {
             return res.status(400).json({ message: "Invalid ID format provided for partnerId or projectId." });
        }
        return res.status(500).json({ message: "Internal server error." });
    }
};




export const addStoryPoint = async (req, res) => {
  const {  storyPoint } = req.body;
  console.log("[addStoryPoint] Request body:", JSON.stringify(req.body));
  if (!storyPoint.userId || storyPoint === undefined || !storyPoint.ticketId) {
    console.warn("[addStoryPoint] Missing required fields");
    return res.status(400).json({ 
      message: "Missing required fields: userId, storyPoint, or ticketId.",
      success: false
    });
  }

  try {
    const updatedTicket = await TicketModel.findByIdAndUpdate(
      storyPoint.ticketId,
      { storyPoint: storyPoint.point }, 
      { new: true } 
    );

    if (!updatedTicket) {
      console.warn("[addStoryPoint] Ticket not found:", storyPoint.ticketId);
      return res.status(404).json({
        message: `Ticket with ID ${storyPoint.ticketId} not found.`,
        success: false
      });
    }

    console.log("[addStoryPoint] Story point updated for ticket:", updatedTicket.ticketKey);
    await ActivityLog.create(
      {
        userId:storyPoint.userId,
        projectId:updatedTicket.projectId,
        actionType:LogActionType.TICKET_STORYPOINT,
        targetType:LogEntityType.TASK,
        targetId:updatedTicket.id ?? updatedTicket._id,
        changes:{
          newValue:updatedTicket.storyPoint,
        },
      }
    )
    return res.status(200).json({
      message: "Story point successfully added/updated.",
      success: true,
      ticket: updatedTicket
    });

  } catch (error) {
    console.error("[addStoryPoint] Error:", error);
    return res.status(500).json({
      message: "Internal server error during update.",
      success: false,
      error: error.message
    });
  }
};


//Fetchiing the activity log for each ticket
export const getWorkLogActivity = async (req, res) => {
  const { ticketId } = req.body;
  console.log("[getWorkLogActivity] Request for ticketId:", ticketId);

  if (!ticketId) {
    console.warn("[getWorkLogActivity] ticketId missing");
    return res.status(400).json({ msg: "Ticket id required" });
  }

  try {
    const ticketLogs = await ActivityLog.find({ targetId: ticketId })
      .sort({ createdAt: -1 })
      .lean();

    console.log("[getWorkLogActivity] Found", ticketLogs.length, "activity logs");

    const updatedLog = await Promise.all(
      ticketLogs.map(async (currElem) => {
        const user = await getUserDetailById(currElem.userId);
        return {
          ...currElem,
          performedBy: user,
        };
      })
    );

    return res.status(200).json({
      success: true,
      logs: updatedLog,
      msg: "Success fetch logs",
    });
  } catch (error) {
    console.error("[getWorkLogActivity] Error:", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};


// this controller is for status values for filtering tickets
export const getSortKeyValues= async (req,res)=>{
  const userId = req.user.userId;
  console.log("[getSortKeyValues] Request received for userId:", userId);
  try {
    const userWorkAccess = await UserWorkAccess.find({ userId: userId });

    if (!userWorkAccess || userWorkAccess.length === 0) {
      console.warn("[getSortKeyValues] User work access not found for userId:", userId);
      return res.status(404).json({ msg: "User not found" });
    }
    const projectIds = userWorkAccess.map(userWorkAccess => userWorkAccess.projectId);
    console.log("[getSortKeyValues] User has access to projects:", projectIds);

    const allWorkingUsers = await UserWorkAccess.find({ projectId: { $in: projectIds } });
    const allUsers = await User.find({ _id: { $in: allWorkingUsers.map(allWorkingUsers => allWorkingUsers.userId) } }).select('_id profile email');
    const workFLow = await ScrumProjectFlow.find({ projectId: { $in: projectIds } });
    const wokFlowStatus =  workFLow.map(workFLow => workFLow.columns.map(columns => columns.name)).flat();
    const uniqueStatus = [...new Set(wokFlowStatus)];
    const uniqueUsers = [...new Set(allUsers)];
    const projects = await ProjectModel.find({
              projectId: { $in: projectIds }
            }).select('projectId projectName').lean();

    const ticketConfig= await TicketConfig.find({ projectId: { $in: projectIds } });
    
    const uniqueLabels = getCleanUniqueItems(ticketConfig, 'labels', ['id', 'name', 'color']);
    const uniquePriority = getCleanUniqueItems(ticketConfig, 'priorities', ['id', 'name', 'color']);
    const uniqueTicketConvention = getCleanUniqueItems(ticketConfig, 'conventions', ['id',  'color', 'suffix']);

    console.log("[getSortKeyValues] Successfully aggregated sort keys. StatusCount:", uniqueStatus.length, "UsersCount:", uniqueUsers.length);

    return res.status(200).json({
      success: true,
      users: uniqueUsers,
      status: uniqueStatus,
      projects: projects,
      labels: uniqueLabels,
      priority: uniquePriority,
      ticketConvention: uniqueTicketConvention,
      msg: "Success fetch sort key values",
    });
  } catch (error) {
    console.error("[getSortKeyValues] Error:", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
}


export const getCurrentProjectSprintWork = async(req,res)=>{
  const userId = req.user.userId;
  const {projectId} = req.query;
  console.log("[getCurrentProjectSprintWork] Request for userId:", userId, "projectId:", projectId);
  try {
    if(!projectId){
      console.warn("[getCurrentProjectSprintWork] projectId missing");
      return res.status(400).json({ msg: "Project id required" });
    }

    const currentUserAccess = await UserWorkAccess.findOne({ userId: userId, projectId: projectId });

    if (!currentUserAccess) {
      console.warn("[getCurrentProjectSprintWork] Access denied for user:", userId, "to project:", projectId);
      return res.status(403).json({ msg: "Access denied to this project" });
    }
    
    const allProjectAccess = await UserWorkAccess.find({ projectId: projectId, status: "accepted" }).lean();
    const projectUserIds = allProjectAccess.map(a => a.userId).filter(id => id != null);

    const sprints = await partnerSprint.find({ projectId: projectId ,status: "ACTIVE"}).sort({ createdAt: -1 }).limit(1).lean();
    
    if (!sprints || sprints.length === 0) {
      console.log("[getCurrentProjectSprintWork] No active sprints found for project:", projectId);
      return res.status(404).json({ sprintWork: [], msg: "Sprint not found" });
    }
    
    const latestSprint = sprints[0];
    console.log("[getCurrentProjectSprintWork] Found active sprint:", latestSprint.sprintName);

    const [users, config, flow] = await Promise.all([
      User.find({ _id: { $in: projectUserIds } }).select('_id profile email').lean(),
      TicketConfig.findOne({ projectId: projectId }).lean(),
      getProjectFlowWithFallback(projectId),
    ]);

    const userFilter = (users || []).map(u => ({
      value: u._id,
      label: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email
    }));

    const labelFilter = (config?.labels || []).map(l => ({
      value: l.id,
      label: l.name
    }));

    const priorityFilter = (config?.priorities || []).map(p => ({
      value: p.id,
      label: p.name
    }));

    const statusFilter = (flow?.columns || []).map(c => ({
      value: c.name, 
      label: c.name
    }));

    const allUserFilterAction = { 
      assignee: userFilter, 
      status: statusFilter, 
      label: labelFilter, 
      priority: priorityFilter 
    };

    const sprintWork = await TicketModel.find({ 
      sprint: latestSprint.id,
      projectId: projectId 
    }).lean();  
    console.log("[getCurrentProjectSprintWork] Found", sprintWork.length, "tickets in sprint");

    const totalStoryPoint = sprintWork.reduce((acc, currElem) => acc + (currElem.storyPoint || 0), 0);
    
    // Process tickets with details
    const ticketsData = await Promise.all(
      sprintWork.map(async (currElem) => {
        const user = await getUserDetailById(currElem.assignee); 
        const ticketPriority = config?.priorities?.find((p) => p.id === (Array.isArray(currElem.priority) ? currElem.priority[0] : currElem.priority));
        const ticketLabel = config?.labels?.find((l) => l.id === (Array.isArray(currElem.labels) ? currElem.labels[0] : currElem.labels));
        
        return {
          ...currElem,
          assignee: user?.name || 'Unassigned',
          assigneeImage: user?.image || null,
          priorityName: ticketPriority?.name || "Unknown",
          priorityColor: ticketPriority?.color || "#6b7280",
          labelsDetails: ticketLabel ? { name: ticketLabel.name, color: ticketLabel.color } : null,
          // Store normalized status for easier mapping
          normalizedStatus: (currElem.status || '').toUpperCase()
        };
      })
    );

    // Group tickets into board flow columns based on statusKeys as a dictionary { columnName: [tickets] }
    const boardColumns = flow?.columns || [];
    const projectBoard = boardColumns.reduce((acc, column) => {
      // Normalize column status keys to uppercase for robust comparison
      const normalizedStatusKeys = (column.statusKeys || []).map(k => k.toUpperCase());
      
      const columnTickets = ticketsData.filter(ticket =>
        normalizedStatusKeys.includes(ticket.normalizedStatus)
      );
      
      acc[column.name] = columnTickets;
      return acc;
    }, {});

    // Calculate status overview based on current column distribution
    const taskStatusOverview = boardColumns.reduce((acc, column) => {
      const normalizedStatusKeys = (column.statusKeys || []).map(k => k.toUpperCase());
      const count = ticketsData.filter(ticket => 
        normalizedStatusKeys.includes(ticket.normalizedStatus)
      ).length;
      acc[column.name] = count;
      return acc;
    }, {});

    console.log("[getCurrentProjectSprintWork] Successfully processed sprint work for:", latestSprint.sprintName);
    return res.status(200).json({
      success: true,
      sprintName: latestSprint?.sprintName || "",
      totalStoryPoint: totalStoryPoint,
      sprintWork: ticketsData, // Flat list with details
      data: projectBoard, // Tickets grouped by board columns (Kanban format)
      columns: boardColumns, // Column metadata (colors, etc.)
      taskStatusOverview: taskStatusOverview,
      allUserFilterAction: allUserFilterAction,
      msg: "Success fetch sprint work",
    });
  } catch (error) {
    console.error("[getCurrentProjectSprintWork] Error:", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
}


export const cloneTicket = async(req,res)=>{
  const userId = req.user.userId;
  const {ticketId} = req.params;
  console.log("[cloneTicket] Request for userId:", userId, "ticketId:", ticketId);
  try {
    if(!ticketId){
      console.warn("[cloneTicket] ticketId missing");
      return res.status(400).json({ success: false, message: "Ticket id required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const ticket = await TicketModel.findById(ticketId);
    if(!ticket){
      console.warn("[cloneTicket] Ticket not found for ticketId:", ticketId);
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const sanitizedData = {
      // Set defaults if not provided
      title: ticket?.title,
      description: ticket?.description,
      type: ticket?.type,
      priority: ticket?.priority,
      status: ticket?.status,
      // Add reporter from authenticated user if not provided
      reporter: ticket?.reporter || user?.username,
      assignee: ticket?.assignee || "Unassigned",
      // Add timestamps
      createdBy: userId,
      storyPoint: ticket?.storyPoint || 0,
      labels: ticket?.labels || [],
      eta: ticket?.eta,
      dueDate: ticket?.dueDate,
      projectId: ticket?.projectId,
      partnerId: ticket?.partnerId,
      sprint: ticket?.sprint,
      clonedFrom: ticketId,
    };

    const clonedTicket = new TicketModel(sanitizedData);
    
    // Derive partnerId if not present (as in createTicketV2) or just to be sure
    if (sanitizedData.projectId) {
      const project = await ProjectModel.findOne({ projectId: sanitizedData.projectId }).lean();
      if (project) {
        clonedTicket.partnerId = project.partnerId;
      }
    }
    
    await clonedTicket.save();

    
    
    console.log("[cloneTicket] Successfully cloned ticket for ticketId:", ticketId);
    return res.status(200).json({ 
      success: true,
      message: "Ticket cloned successfully",
      ticket: clonedTicket,
      redirectUrl: `/tickets/${clonedTicket._id}`
    });
  } catch (error) {
    console.error("[cloneTicket] Error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}


// export const createSubTaskForTickets = as