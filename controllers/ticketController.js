import { TicketModel } from "../models/TicketModels.js";
import User from "../models/UserModel.js";
import   {UserWorkAccess} from "../models/PlatformModel/UserWorkAccessModel.js";
import mongoose from "mongoose";
import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../models/PlatformModel/SprintModels/partnerSprint.js";
import ActivityLog from "../models/PlatformModel/ActivityLogModel.js";
import { LogActionType, LogEntityType } from "../models/PlatformModel/Enums/ActivityLogEnum.js";
import { getUserDetailById } from "../utility/platformUtility.js";

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
  let priority = (ticketData?.priority || '').toString().toUpperCase();
    // Optional: Sanitize and set defaults
    const sanitizedData = {
      // Set defaults if not provided
      title:ticketData?.title,
      description:ticketData?.description,
      type: ticketData?.type?.type || ticketData?.type,
      priority: priority || 'MEDIUM',
      status: ticketData?.status || 'OPEN',
      // Add reporter from authenticated user if not provided
      reporter: ticketData?.reporter  || user?.username,
      assignee: ticketData?.assignee || "Unassigned",
      // Add timestamps
      createdBy: user?.userId,
      projectId: ticketData?.projectId,
      // Remove any undefined or null values
    };

    // Remove undefined/null values
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] === undefined || sanitizedData[key] === null) {
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

    // await ActivityLog.create(
    //   {
    //     userId:userId,
    //     projectId:ticket.projectId,
    //     actionType:LogActionType.TICKET_CREATE,
    //     targetType:LogEntityType.TASK,
    //     targetId:ticket.id ?? ticket._id,
    //     changes:[{
    //       newValue:ticket.ticketKey,
    //     }],
    //   }
    // )

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
      type, // Not used in filters yet, but kept for future use
      status,
      priority,
      assignee,
      reporter,
      userId, // Used for access control, assumed to be available
      projectId,
      partnerId,
    } = req.query;

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    // Step 1: Find accepted access
    // Note: Assuming UserWorkAccess model and connection are available globally.
    const userAccessList = await UserWorkAccess.find({
      userId,
      status: "accepted",
    }).lean();

    // Step 2: Extract and normalize IDs to strings
    const allowedProjectIds = userAccessList
      .map((a) => String(a.projectId))
      .filter(Boolean);
    const allowedPartnerIds = userAccessList
      .map((a) => String(a.partnerId))
      .filter(Boolean);

    // CRITICAL ACCESS CHECK: If the user has no accepted access, they shouldn't see anything.
    if (allowedProjectIds.length === 0 && allowedPartnerIds.length === 0) {
        return res.status(200).json({
            page: numericPage,
            limit: numericLimit,
            total: 0,
            items: [],
            accessibleProjects: [],
            accessiblePartners: [],
        });
    }

    // Step 3: Build filters
    const filters = {};

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignee) filters.assignee = assignee;
    if (reporter) filters.reporter = reporter;

    // --- 🔹 Project Filter (Handles mixed UUID/ObjectId) ---
    const projectIdString = projectId ? String(projectId) : null;

    if (projectIdString) {
      if (!allowedProjectIds.includes(projectIdString)) {
        return res
          .status(403)
          .json({ message: "Access denied: no permission for this project." });
      }

      // Check for ObjectId format to handle legacy/mixed IDs
      if (projectIdString.length === 24 && mongoose.Types.ObjectId.isValid(projectIdString)) {
        filters.projectId = new mongoose.Types.ObjectId(projectIdString);
      } else {
        // Assume UUID string
        filters.projectId = projectIdString;
      }
      
    } else if (allowedProjectIds.length > 0) {
      // If no projectId is specified, filter by all allowed projects.
      const mixedProjectIds = allowedProjectIds.map(id => {
        if (id.length === 24 && mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        return id; // Use as string (UUID)
      });

      filters.projectId = {
           $in: mixedProjectIds,
      };
    }
    // Note: If allowedProjectIds is empty, tickets are implicitly restricted by the partner filter below.

    // --- 🔹 Partner Filter (UUIDs/Strings) ---
    const partnerIdString = partnerId ? String(partnerId) : null;
    
    if (partnerIdString) {
      if (!allowedPartnerIds.includes(partnerIdString)) {
        return res
          .status(403)
          .json({ message: "Access denied: no permission for this partner." });
      }
      filters.partnerId = partnerIdString;
    } else if (allowedPartnerIds.length > 0) {
      // If no partnerId specified, filter by all allowed partners.
      filters.partnerId = { $in: allowedPartnerIds };
    }
    // Note: If allowedPartnerIds is empty, filters.partnerId will be undefined.
    
    // --- Access Validation Check ---
    // If the user has access but neither project nor partner filtering criteria were met (highly unlikely 
    // given the check at the top, but serves as a final safeguard)
    // You might want to ensure AT LEAST ONE of filters.projectId or filters.partnerId is set if access list is non-empty.

    // Step 4: Query tickets
    const [items, total] = await Promise.all([
            TicketModel.find(filters)
              .sort({ createdAt: -1 })
              .skip((numericPage - 1) * numericLimit)
              .limit(numericLimit)
              .lean(),
            TicketModel.countDocuments(filters),
          ]);

          const sprintIds = items
            .map(ticket => ticket.sprint)
            .filter(Boolean);
            console.log(sprintIds)

          if (sprintIds.length) {
            const sprints = await partnerSprint
              .find({ id: { $in: sprintIds } })
              .lean();
            console.log(sprints)
            const sprintMap = {};
            sprints.forEach(sprint => {
              sprintMap[sprint.id] = sprint;
            });

            items.forEach(ticket => {
              ticket.sprint = sprintMap[ticket.sprint]?.sprintName || "";
            });
          }

    // Step 5: Return response
    return res.status(200).json({
      page: numericPage,
      limit: numericLimit,
      total,
      items,
      accessibleProjects: allowedProjectIds,
      accessiblePartners: allowedPartnerIds,
    });
    
  } catch (err) {
    console.error("❌ Error listing tickets:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await TicketModel.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(ticket);
  } catch (err) {
    console.error("Error getting ticket:", err);
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
        changes:[{
          newValue:update,
        }],
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
      loggedBy         // The ID or name of the user logging the time
    } = req.body;

    // --- Input Validation ---
    
    // Check for required fields
    if (!ticketId || durationSeconds == null || !loggedBy) {
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
            loggedBy 
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
        changes:[{
          newValue:durationMinutes,
        }],
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

// Assuming TicketModel and User model are imported
export const setAssignee = async (req, res) => {
    try {
        const ticketId = req.params.id;
        const  {userId}  = req.body;
        console.log(userId,"dfvgbh")
        // ... (Input Validation remains the same) ...
        if (!userId || !ticketId) {
            return res.status(400).json({ success: false, message: "Missing ticket ID or user ID (assignee)." });
        }

        // --- Find Assignee Details ---
        const assigneeDetails = await User.findById(userId);

        if (!assigneeDetails) {
            return res.status(404).json({ success: false, message: `User with ID ${userId} not found.` });
        }

        // 💡 FIX 2: Check the property on the User model. It's usually '_id' for reference.
        // Assuming your TicketModel 'assignee' field is of type { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        const updatedTicket = await TicketModel.findByIdAndUpdate(
            ticketId,
            { 
                // 💡 CRITICAL FIX: Save the user's MongoDB ID for proper referencing/population
                assignee: assigneeDetails.username 
            },
            { new: true, runValidators: true }
        );

        if (!updatedTicket) {
            return res.status(404).json({ success: false, message: `Ticket with ID ${ticketId} not found.` });
        }
        
        // Success
        return res.status(200).json({ success: true, ticket: updatedTicket });
    } catch (err) {
        console.error("Error setting assignee:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const setPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { priority },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error setting priority:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body;
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { $addToSet: { labels: label } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error adding label:", err);
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
  try {
    const { type, title } = req.query;
    if (!type || !title) {
      return res
        .status(400)
        .json({ message: "'type' and 'title' are required" });
    }
    const key = await TicketModel.getNextTicketKey(type, title);
    return res.status(200).json({ key });
  } catch (err) {
    console.error("Error previewing ticket key:", err);
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
console.log(req.body)
  // 1. Input Validation Check
  if (!storyPoint.userId || storyPoint === undefined || !storyPoint.ticketId) {
    // Note: storyPoint might be 0, so check against undefined/null, not just falsy value
    return res.status(400).json({ 
      message: "Missing required fields: userId, storyPoint, or ticketId.",
      success: false
    });
  }

  try {
    // Use TicketId directly and pass the update object correctly.
    // { new: true } option ensures the function returns the updated document.
    const updatedTicket = await TicketModel.findByIdAndUpdate(
      storyPoint.ticketId,
      { storyPoint: storyPoint.point }, // The update object
      { new: true } // Return the new, modified document
    );

    // 3. Check if ticket was found and updated
    if (!updatedTicket) {
      return res.status(404).json({
        message: `Ticket with ID ${storyPoint.ticketId} not found.`,
        success: false
      });
    }

    // 4. Success Response
    return res.status(200).json({
      message: "Story point successfully added/updated.",
      success: true,
      ticket: updatedTicket
    });

  } catch (error) {
    // 5. Error Handling
    console.error("Error updating story point:", error);
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

  if (!ticketId) {
    return res.status(400).json({ msg: "Ticket id required" });
  }

  try {
    const ticketLogs = await ActivityLog.find({ targetId: ticketId })
      .sort({ createdAt: -1 })
      .lean();

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
    console.error("getWorkLogActivity error:", error);
    return res.status(500).json({ msg: "Something went wrong" });
  }
};
