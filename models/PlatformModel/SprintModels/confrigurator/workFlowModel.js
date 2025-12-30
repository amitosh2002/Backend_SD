import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";


/**
 * Column schema (same shape as Sprint Board)
 */
const FlowColumnSchema = new mongoose.Schema(
  {
    id: {
      type: String, // col_1, col_2
      required: true,
    },

    name: {
      type: String, // Open, In Progress, Done
      required: true,
      trim: true,
    },

    statusKeys: {
      type: [String], // OPEN, IN_PROGRESS, CLOSED
      required: true,
      default: [],
    },

    color: {
      type: String,
      required: true,
    },

    wipLimit: {
      type: Number,
      default: null,
    },

    order: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/**
 * Scrum Project Flow schema
 * (Controls status movement like Open → In Progress → Done)
 */
const ScrumProjectFlowSchema = new mongoose.Schema(
  {
    /** Optional project binding */
       id:{
             type: String,            
              required: true,
              unique: true,
              // default: () => uuid(),  // ✅ Auto-generate UUID
              default: () => uuidv4(),
        },
    projectId: {
      type: String,
      ref: "Projects",
      default: null, // null = reusable flow/template
      index: true,
    },

    flowName: {
      type: String,
      required: true,
      default: "Default Scrum Flow",
    },

    /**
     * SAME structure as Sprint Board
     * so same component can be reused
     */
    columns: {
      type: [FlowColumnSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one column is required",
      },
    },

    /** Import / reuse support */
    sourceType: {
      type: String,
      enum: ["PROJECT", "TEMPLATE", "IMPORTED"],
      default: "PROJECT",
    },

    importedFromFlowId: {
      type: String,
      ref: "ScrumProjectFlow",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: String,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ScrumProjectFlow = mongoose.model(
  "ScrumProjectFlow",
  ScrumProjectFlowSchema
);

export default ScrumProjectFlow;
