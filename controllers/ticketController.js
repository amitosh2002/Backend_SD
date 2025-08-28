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

    // Optional: Sanitize and set defaults
    const sanitizedData = {
      ...ticketData,
      // Set defaults if not provided
      priority: ticketData.priority || 'MEDIUM',
      status: ticketData.status || 'BACKLOG',
      // Add reporter from authenticated user if not provided
      reporter: ticketData.reporter  || user?.username,
      assignee: ticketData.assignee || "Unassigned",
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

export const addTimeLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes, note, loggedBy } = req.body;
    if (minutes == null || minutes < 0) {
      return res.status(400).json({ message: "'minutes' must be >= 0" });
    }
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { $push: { timeLogs: { minutes, note, loggedBy } } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
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

export const setAssignee = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignee } = req.body;
    const updated = await TicketModel.findByIdAndUpdate(
      id,
      { assignee },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error setting assignee:", err);
    return res.status(500).json({ message: "Internal server error" });
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


