import mongoose from "mongoose";
const UserWorkAccessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  
  partnerId: {
    type: String,
  },
  projectId: {
    type: String,
  },
  accessType: {
    type: Number,
    enum: [100, 200, 300,400],
    default: 100,
  },
  invitedEmail:{
    type:String,
    default:null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "revoked"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ Sparse unique index to allow multiple null userId entries
UserWorkAccessSchema.index(
  { userId: 1, partnerId: 1, projectId: 1 },
  { unique: true, sparse: true }
);

export const UserWorkAccess = mongoose.model(
  "UserWorkAccess",
  UserWorkAccessSchema
);