// models/GithubEvent.js
import mongoose from "mongoose";

const GithubEventSchema = new mongoose.Schema(
  {
    installationId: Number,
    event: String, // push, pull_request, installation, etc
    action: String, // created, opened, closed
    repoId: Number,

    payload: {
      type: Object, // raw webhook payload
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GithubEvent", GithubEventSchema);
