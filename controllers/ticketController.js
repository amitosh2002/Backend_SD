import { TicketModel } from "../models/TicketModels.js";
import User from "../models/UserModel.js";

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
    const userId =req.body.userId;
    const user=await User.findById(userId);
    if(!user){
      return res.status(400).json({message:"User not found"});
    }

    // Basic validation
    if (!ticketData.title || !ticketData.type) {
      return res.status(400).json({
        success: false,
        message: "'title' and 'type' are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }
   let priority = ticketData?.priority.toUpperCase();
    console.log(priority)
    // Optional: Sanitize and set defaults
    const sanitizedData = {
      // Set defaults if not provided
      title:ticketData?.title,
      description:ticketData?.description,
      type:ticketData?.type?.type,
      priority: priority || 'MEDIUM',
     status: ticketData?.status || 'OPEN',
      // Add reporter from authenticated user if not provided
      reporter: ticketData?.reporter  || user?.username,
      assignee: ticketData?.assignee || "Unassigned",
      // Add timestamps
      createdBy: user?.userId,
      // Remove any undefined or null values
    };

    // Remove undefined/null values
    Object.keys(sanitizedData).forEach(key => {
      if (sanitizedData[key] === undefined || sanitizedData[key] === null) {
        delete sanitizedData[key];
      }
    });

    const ticket = new TicketModel(sanitizedData);
    await ticket.save();

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: {
        id: ticket._id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        type: ticket.type,
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
      type,
      status,
      priority,
      assignee,
      reporter,
    } = req.query;
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const filters = { type, status, priority, assignee, reporter };
    const query = TicketModel.findByFilters(filters);

    const [items, total] = await Promise.all([
      query
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit)
        .lean(),
      TicketModel.findByFilters(filters).countDocuments(),
    ]);

    return res
      .status(200)
      .json({ page: numericPage, limit: numericLimit, total, items });
  } catch (err) {
    console.error("Error listing tickets:", err);
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
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
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


