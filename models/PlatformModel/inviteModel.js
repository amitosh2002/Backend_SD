import mongoose from "mongoose";
const InviteSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  inviterId: { type: String, required: true },
  inviteeEmail: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, enum: ["Pending","Accepted","Declined"], default: "Pending" },
  invitationToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Invite", InviteSchema);
