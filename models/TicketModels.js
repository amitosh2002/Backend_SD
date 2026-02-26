import mongoose from "mongoose";
import { CounterModel } from "./CounterModels.js";
import { TicketConfig } from "./PlatformModel/TicketUtilityModel/TicketConfigModel.js";

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


const TicketSchema = new mongoose.Schema(
  {

     partnerId: {
        type: String,
        ref: 'Partner', // Reference your Partner model
        // required: [true, "Partner ID is required for the ticket context"],
        index: true,
    },
    projectId: {
        type: String,
        ref: 'Project', // Reference your Project model
        required: [true, "Project ID is required for the ticket context"],
        index: true,
    },
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
          
          set: (val) => val ? val.toUpperCase() : val, 
          

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
      type: [String],   // array of label IDs
        default: [],
        index: true
      },
    status: {
      type: String,
      required: false,
      trim: true,
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
      type: String,
      required: false,
      trim: true,
    },
    githubBranches: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        status: {
          type: String,
          // enum: ["CREATED", "MERGED", "DELETED"],
          default: "CREATED",
        },
        createdBy: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
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
      labels: {
        type: [String],   // array of label IDs
        default: [],
        index: true
      }
      ,
          dueDate: {
      type: Date,
      required: false,
    },
    estimatedHours: {
      type: Number,
      required: false,
      min: [0, "Estimated hours cannot be negative"],
    },
    eta: {
      type: Date,
      required: false,
    },
    sprint: {
      type: String,
      required: false,
      ref:"PartnerSprint",
      default:null
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
// Pre-validation middleware to assign sequence number and generate ticket key
// Pre-validation middleware to assign sequence number and generate ticket key
TicketSchema.pre("validate", async function assignSequenceAndKey(next) {
    try {
        // Only run for new documents
        if (!this.isNew) return next();

        // If already set (e.g., during migration or manual assignment), skip
        if (this.sequenceNumber && this.ticketKey) return next();

        // 💡 FIX: Check if required fields are present before using them.
        // This is necessary because Mongoose's final 'required' check runs later.
        if (!this.type) {
            // Mongoose will catch the 'required' error later, but we prevent an early middleware crash.
            return next(); 
        }
        if (!this.title) {
            return next();
        }
        
        // At this point, this.type is guaranteed to be a non-empty, uppercased string
        // (due to the setter in the schema definition).

        // Get next sequence number for this ticket type
        // Use a composite ID for the counter to ensure project-specific sequences
        const counterId = `${this.projectId}_${this.type}`;
        const counter = await CounterModel.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        this.sequenceNumber = counter.seq;

        // Generate ticket key (this.type is already uppercase)
        const sequence = String(this.sequenceNumber);
        const slugifiedTitle = slugifyTitle(this.title);
        // 1. Fetch the project configuration
        const ticketConfig = await TicketConfig.findOne({
          projectId: this.projectId,
        });

        // 2. Find the convention object that matches the ticket type
        const convention = ticketConfig?.conventions.find(c => c.id === this.type);

        // 3. Extract the suffix (e.g., "BUG") or fallback to the type itself if not found
        const suffix = convention?.suffix || this.type;

        // 4. Construct the final key
        this.ticketKey = `${suffix}-${sequence}-${slugifiedTitle}`; 

        return next();
    } catch (err) {
        console.error("Error in assignSequenceAndKey middleware:", err);
        return next(err);
    }
});;
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
TicketSchema.index({ projectId: 1, type: 1, sequenceNumber: 1 }, { unique: true });
TicketSchema.index({ ticketKey: 1 }, { unique: true, sparse: true });
TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ assignee: 1, status: 1 });

// TicketSchema.index({ partnerId: 1, projectId: 1, status: 1 }); // New index for fast queries
// TicketSchema.index({ assignee: 1, status: 1, partnerId: 1 }); // Improved assignee query
TicketSchema.index({ createdAt: -1 });

// Static method to get next ticket key preview
TicketSchema.statics.getNextTicketKey = async function (projectId, type, title) {
  try {
    const counterId = `${projectId}_${type.toUpperCase()}`;
    const counter = await CounterModel.findById(counterId);
    const nextSeq = counter ? counter.seq + 1 : 1;
    const slugifiedTitle = slugifyTitle(title);

    // Fetch config to get the correct suffix
    const ticketConfig = await TicketConfig.findOne({ projectId });
    const convention = ticketConfig?.conventions.find(c => c.id === type.toUpperCase());
    const suffix = convention?.suffix || type.toUpperCase();

    return `${suffix}-${nextSeq}-${slugifiedTitle}`;
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


