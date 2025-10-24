import mongoose from "mongoose";



const UserWorkAccessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  partnerId: {
    type:String,
    // ref: "Partner",
  },
  projectId: {
    type: String,
    // ref: "Project",
  },
   accessType: {
   type: Number,
    enum: [100, 200, 300], // 100 = Viewer, 200 = Manager, 300 = Admin
    default: 100,
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

UserWorkAccessSchema.index({ userId: 1, partnerId: 1, projectId: 1 }, { unique: true });


export const UserWorkAccess = mongoose.model("UserWorkAccess", UserWorkAccessSchema);
