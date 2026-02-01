import mongoose from "mongoose";

const ProjectServiceSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      ref: "Projects",
      required: true
    },
    serviceId: {
      type: String,
      ref: "HoraService",
      required: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PENDING"],
      default: "ACTIVE"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    activatedBy: {
      type: String,
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



// making virtual for service to populate data 
ProjectServiceSchema.virtual("service", {
  ref: "HoraService",
  localField: "serviceId",
  foreignField: "serviceId",
  justOne: true
});

export default mongoose.model("ProjectService", ProjectServiceSchema);
