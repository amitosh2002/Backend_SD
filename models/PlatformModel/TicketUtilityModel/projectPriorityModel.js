import mongoose from "mongoose";

const TicketPriorityModel = new mongoose.Schema(
  {
    projectId: {
      type: String,
      ref: "Project",
      required: true,
      index: true,
    },

    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // examples: low, medium, high, highest, blocker
    },

    label: {
      type: String,
      required: true,
      trim: true,
      // examples: "Low", "High", "Highest"
    },

    level: {
      type: Number,
      required: true,
      // higher number = higher priority
      // ex: 1 = Low, 5 = Highest
    },

    color: {
      type: String,
      required: true,
      // hex or tailwind class
      // ex: "#EF4444" or "red-500"
    },

    backgroundColor: {
      type: String,
      default: null,
      // optional softer bg
      // ex: "#FEE2E2"
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default TicketPriorityModel = mongoose.model("TicketPrioriyModel",TicketPriorityModel)