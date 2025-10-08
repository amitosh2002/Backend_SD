import mongoose from "mongoose";
import { CounterModel } from "./CounterModels.js";

// Improved slugify function
function slugifyTitle(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, "") // Remove special chars but keep spaces
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/(^-|-$)/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length to prevent very long keys
}

// Define valid ticket types (you can modify this based on your needs)
const TICKET_TYPES = [
  "ARCH",
  "BUG",
  "FEATURE",
  "TASK",
  "STORY",
  "EPIC",
  "IMPROVEMENT",
  "SUBTASK",
  "TEST",
  "DOCUMENTATION",
  // Custom/portfolio types
  "LIVEOPS",
  "PLAT",
];
const ENUMS =[
  "OPEN",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DEV_TESTING",
    "RESOLVED",
    "M1 TESTING COMPLETED",
    "M2 TESTING COMPLETED",
    "REJECTED",
    "ON_HOLD",
    "REOPENED",
    "CLOSED",
     null 
]

const TicketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Ticket title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      minlength: [3, "Title must be at least 3 characters long"],
    },
    type: {
      type: String,
      required: [true, "Ticket type is required"],
      trim: true,
      uppercase: true,
      enum: {
        values: TICKET_TYPES,
        message: "Invalid ticket type. Must be one of: {VALUE}",
      },
    },
    sequenceNumber: {
      type: Number,
      required: false,
      index: true,
      min: [1, "Sequence number must be positive"],
    },
    ticketKey: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
      index: true,
    },
    priority: {
      type: String,
      required: false,
      trim: true,
      enum: {
        values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        message: "Priority must be LOW, MEDIUM, HIGH, or CRITICAL",
      },
      default: "MEDIUM",
    },
    status: {
      type: String,
      required: false,
      trim: true,
      enum: {
        values:ENUMS,
        message: "Invalid status",
      },
      default: "OPEN",
    },
      description: {
      type: mongoose.Schema.Types.Mixed, // Allows any type, including objects
      required: false,
    },
    reporter: {
      type: String,
      required: false,
      trim: true,
    },
    assignee: {
      type: Object,
      required: false,
      trim: true,
    },
    branch: {
      type: {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        status: {
          type: String,
          enum: ["CREATED", "MERGED", "DELETED"],
          default: "CREATED",
        },
      },
      required: false,
    },
    totalTimeLogged: {
        type: Number,
        default: 0,
        min: [0, "Total time cannot be negative"],
      },
    timeLogs:[
      {
        minutes: {
          type: Number,
          required: true,
          min: [0, "Time logged cannot be negative"],
        },
        note: {
          type: String,
          required: false,
          trim: true,
          maxlength: [500, "Time log note cannot exceed 500 characters"],
        },
        loggedBy: { type: String, required: false, trim: true },
        at: { type: Date, default: Date.now },
      },
    ],
    storyPoint: {
      type: Number,
      required: false,
      min: [0, "Story points cannot be negative"],
      max: [100, "Story points cannot exceed 100"],
    },
    reviewDocument: {
      type: {
        url: { type: String, trim: true },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        reviewedBy: { type: String, trim: true },
        reviewedAt: { type: Date },
      },
      required: false,
    },
    ticketLog: [
      {
        action: { type: String, required: true, trim: true },
        performedBy: { type: String, required: false, trim: true },
        previousValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    dueDate: {
      type: Date,
      required: false,
    },
    estimatedHours: {
      type: Number,
      required: false,
      min: [0, "Estimated hours cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ticket age in days
TicketSchema.virtual("ageInDays").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-validation middleware to assign sequence number and generate ticket key
TicketSchema.pre("validate", async function assignSequenceAndKey(next) {
  try {
    // Only run for new documents
    if (!this.isNew) return next();

    // Ensure required fields
    if (!this.type) return next(new Error("Ticket type is required"));
    if (!this.title) return next(new Error("Ticket title is required"));

    // If already set (e.g., during migration or manual assignment), skip
    if (this.sequenceNumber && this.ticketKey) return next();

    // Get next sequence number for this ticket type
    const counter = await CounterModel.findByIdAndUpdate(
      this.type.toUpperCase(),
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.sequenceNumber = counter.seq;

    // Generate ticket key without padding; type upper, slug lower
    const sequence = String(this.sequenceNumber);
    const slugifiedTitle = slugifyTitle(this.title);
    this.ticketKey = `${this.type.toUpperCase()}-${sequence}-${slugifiedTitle}`;

    return next();
  } catch (err) {
    console.error("Error in assignSequenceAndKey middleware:", err);
    return next(err);
  }
});

// Pre-save middleware for logging changes
TicketSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified()) {
    // Log the changes
    const modifiedPaths = this.modifiedPaths();
    const changes = {
      action: "UPDATED",
      performedBy: this.updatedBy || "System", // You can set this in your route
      timestamp: new Date(),
      modifiedFields: modifiedPaths,
    };

    if (!this.ticketLog) this.ticketLog = [];
    this.ticketLog.push(changes);
  }
  next();
});

// Index for better query performance
TicketSchema.index({ type: 1, sequenceNumber: 1 }, { unique: true });
TicketSchema.index({ ticketKey: 1 }, { unique: true, sparse: true });
TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ assignee: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });

// Static method to get next ticket key preview
TicketSchema.statics.getNextTicketKey = async function (type, title) {
  try {
    const counter = await CounterModel.findById(type.toUpperCase());
    const nextSeq = counter ? counter.seq + 1 : 1;
    const slugifiedTitle = slugifyTitle(title);

    return `${type.toUpperCase()}-${nextSeq}-${slugifiedTitle}`;
  } catch (error) {
    console.error("Error getting next ticket key:", error);
    throw error;
  }
};

// Static method to find tickets by various criteria
TicketSchema.statics.findByFilters = function (filters = {}) {
  const query = {};

  if (filters.type) query.type = filters.type.toUpperCase();
  if (filters.status) query.status = filters.status.toUpperCase();
  if (filters.priority) query.priority = filters.priority.toUpperCase();
  if (filters.assignee) query.assignee = new RegExp(filters.assignee, "i");
  if (filters.reporter) query.reporter = new RegExp(filters.reporter, "i");

  return this.find(query).sort({ createdAt: -1 });
};



export const TicketModel = mongoose.model("Ticket", TicketSchema);

// Export ticket types for use in frontend
export { TICKET_TYPES };
