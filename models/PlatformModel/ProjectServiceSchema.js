import mongoose from "mongoose";

const ProjectServiceSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HoraService",
      required: true
    },

    planType: {
      type: String,
      enum: ["FREE", "PREMIUM", "ENTERPRISE"],
      required: true,
      default:"FREE"
    },

    liveDate: {
      type: Date,
    //   required: true
    default:Date.now

    },
    isActive: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

// Prevent duplicate service for same project
ProjectServiceSchema.index(
  { projectId: 1, serviceId: 1 },
  { unique: true }
);

export default mongoose.model("ProjectService", ProjectServiceSchema);
