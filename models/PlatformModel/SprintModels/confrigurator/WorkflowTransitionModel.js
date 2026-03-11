import mongoose from "mongoose";

const WorkflowTransitionSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  from: { type: String, required: true }, // Status key, e.g. "IN_REVIEW"
  to: { type: String, required: true },   // Status key, e.g. "QA"
  label: { type: String, default: "" },
  color: { type: String, default: "#64748b" },
  type: { type: String, enum: ["forward", "backward"], default: "forward" }
}, { timestamps: true });

WorkflowTransitionSchema.index({ projectId: 1, from: 1, to: 1 }, { unique: true });

export default mongoose.model("WorkflowTransition", WorkflowTransitionSchema);
