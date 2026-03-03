// models/GithubInstallation.js
import mongoose from "mongoose";

const GithubInstallationSchema = new mongoose.Schema(
  {
    installationId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    projectId: {
      type: String,
      ref: "Projects",
      required: true,
    },

    // Hora user or workspace
    userId: {
      type: String,
      ref: "User", // or Workspace
      required: true,
    },

    permissions: {
      type: Map,
      of: String, // read / write
    },

    events: [String], // subscribed events

    suspended: {
      type: Boolean,
      default: false,
    },

    installedAt: {
      type: Date,
      default: Date.now,
    },
    accessToken: {
      type: String,
    },
    provider: {
      type: String,
      enum: ["github"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "GithubInstallation",
  GithubInstallationSchema
);
