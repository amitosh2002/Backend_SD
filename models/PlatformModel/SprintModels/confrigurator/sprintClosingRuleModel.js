import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const SprintClosingRuleSchema = new mongoose.Schema(
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
    blockingKeys: {
      type: [String],
      default: ["OPEN", "IN_PROGRESS", "IN_REVIEW"],
    },
    moveStatuses: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: "User",
    },
    updatedBy: {
      type: String,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SprintClosingRule", SprintClosingRuleSchema);
