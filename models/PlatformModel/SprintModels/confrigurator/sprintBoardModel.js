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

const WorkFlowSourceENUM=["PROJECT", "IMPORTED", "TEMPLATE"];

const SprintBoardConfigSchema = new mongoose.Schema(
  {

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

    workflowSource: {
      type: String,
      enum:WorkFlowSourceENUM ,
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

// export default mongoose.model("SprintBoardConfig", SprintBoardConfigSchema);
export default mongoose.model("SprintBoardConfig", SprintBoardConfigSchema);

