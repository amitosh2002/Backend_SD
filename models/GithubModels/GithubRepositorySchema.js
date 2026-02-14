// models/GithubRepository.js
import mongoose from "mongoose";

const GithubRepositorySchema = new mongoose.Schema(
  {
    installationId: {
      type: Number,
      required: true,
      index: true,
    },

    repoId: {
      type: Number,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    fullName: {
      type: String, // owner/repo
      required: true,
    },

    private: Boolean,

    owner: 
   { type:Object},
    url: String,
    defaultBranch: String,

    // 🔗 Hora Project mapping
    projectId: {
      type: String,
      ref: "Projects",
      default: null,
    },

    permissions: {
      admin: Boolean,
      push: Boolean,
      pull: Boolean,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },

    removedAt: {
      type: Date,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GithubRepositorySchema", GithubRepositorySchema);
