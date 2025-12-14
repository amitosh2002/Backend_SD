import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const partnerSprintSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
    },

    partnerId: {
      type: String,
      required: true,
      ref: "Partner",
      index: true,
    },

    projectId: {
      type: String,
      required: true,
      ref: "Projects",
      index: true,
    },

    sprintNumber: {
      type: Number,
      required: true,
    },

    sprintName: {
      type: String,
      required: true, // Sprint-1, Sprint-2...
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    status:{
      type: String,
      enum: ['PLANNED', 'ACTIVE', 'COMPLETED'],
      default: 'PLANNED',
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

/* ================================
   UNIQUE CONSTRAINTS (PER PROJECT)
================================ */
partnerSprintSchema.index(
  { projectId: 1, sprintNumber: 1 },
  { unique: true }
);

partnerSprintSchema.index(
  { projectId: 1, sprintName: 1 },
  { unique: true }
);

/* ================================
   SAFE AUTO-INCREMENT LOGIC
================================ */
partnerSprintSchema.pre("validate", async function (next) {
  try {
    if (!this.sprintNumber) {
      const lastSprint = await mongoose
        .model("PartnerSprint")
        .findOne({
          projectId: this.projectId,
          partnerId: this.partnerId,
        })
        .sort({ sprintNumber: -1 })
        .select("sprintNumber");

      const nextNumber = lastSprint ? lastSprint.sprintNumber + 1 : 1;

      this.sprintNumber = nextNumber;
      this.sprintName = this.sprintName || `Sprint-${nextNumber}`;
    }

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("PartnerSprint", partnerSprintSchema);
