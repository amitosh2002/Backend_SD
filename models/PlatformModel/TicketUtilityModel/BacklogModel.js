import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const BacklogSchema = new mongoose.Schema(
{
    id:{
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
    },
  projectId: {
    type: String,
    ref: "Project",
    required: true
  },
  title: {
    type: String,
    // required: true
    default: "Backlog"
  },

  projectName: {
    type: String,
    required: true
  },

  description: String,

  createdBy: {
    type: String,
    ref: "User"
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
},
{ timestamps: true }
);

export default mongoose.model("Backlog", BacklogSchema);