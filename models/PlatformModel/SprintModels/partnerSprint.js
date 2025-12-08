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
    },

    projectId: {
      type: String,
      required: true,
      ref: "Projects",
    },

    sprintNumber: {
      type: Number,
      required: true,
    },

    sprintName: {
      type: String, // e.g., Sprint-1
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
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

// AUTO-GENERATE "Sprint-N" BEFORE SAVE
partnerSprintSchema.pre("validate", async function (next) {
  if (!this.sprintNumber) {
    const count = await mongoose.model("PartnerSprint").countDocuments({
      partnerId: this.partnerId,
      projectId: this.projectId,
    });

    this.sprintNumber = count + 1;
    this.sprintName = `Sprint-${this.sprintNumber}`;
  }

  next();
});

export default mongoose.model("PartnerSprint", partnerSprintSchema);
