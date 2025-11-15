import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const invitationTrackingSchema = new mongoose.Schema({
  invitationId: {
    type: String,
    default: () => uuidv4(),
  },
  email: {
    type: String,
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  projectId: {
    type: String,
    ref: "Project",
    required: true,
  },
  partnerId: {
    type: String,
    ref: "Partner",
    required: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const InvitationTracking = mongoose.model(
  "InvitationTracking",
  invitationTrackingSchema
);
