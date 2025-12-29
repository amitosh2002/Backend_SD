import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const ColumnSchema = new mongoose.Schema(
  {
    columnId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    statusKeys: { type: [String], required: true },
    color: { type: String, required: true },
    wipLimit: { type: Number, default: null },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const SprintBoardConfigSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    projectId: {
      type: String,
      ref: "Projects",
      required: true,
      index: true,
    },
    boardName: {
      type: String,
      default: "Sprint Board",
    },
    columns: {
      type: [ColumnSchema],
      default: [],
    },
    // New fields for board-specific flow
    statuses: {
      type: [
        {
          key: { type: String, required: true },
          label: { type: String, required: true },
          description: { type: String, default: "" },
          color: {
            bg: { type: String, default: "#dbeafe" },
            text: { type: String, default: "#1e40af" },
            border: { type: String, default: "#3b82f6" },
          },
          isTerminal: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    transitions: {
      type: [
        {
          from: { type: String, required: true },
          to: { type: String, required: true },
        },
      ],
      default: [],
    },
    workflowSource: {
      type: String,
      enum: ["PROJECT", "IMPORTED", "TEMPLATE"],
      default: "PROJECT",
    },
    importedFromProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Projects",
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
  { timestamps: true }
);

export default mongoose.model("SprintBoardConfig", SprintBoardConfigSchema);
