import mongoose from "mongoose";

const BoardColumnSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  statusKeys: [{ type: String }], // Array of normalized status keys, e.g. ["IN_REVIEW", "QA"]
  color: { type: String, default: "#6366f1" },
  order: { type: Number, default: 0 },
  wipLimit: { type: Number, default: null }
}, { timestamps: true });

export default mongoose.model("BoardColumn", BoardColumnSchema);
