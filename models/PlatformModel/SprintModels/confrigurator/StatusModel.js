import mongoose from "mongoose";

const StatusSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  key: { type: String, required: true }, // Normalized key, e.g. "IN_REVIEW"
  label: { type: String, required: true }, // Display name, e.g. "In Review"
  color: { type: String, default: "#3b82f6" },
  category: { type: String, enum: ["todo", "active", "done"], default: "active" },
  order: { type: Number, default: 0 }
}, { timestamps: true });

StatusSchema.index({ projectId: 1, key: 1 }, { unique: true });

export default mongoose.model("Status", StatusSchema);
