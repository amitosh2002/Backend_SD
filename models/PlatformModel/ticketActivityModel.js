import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const ticketActivitySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
    },

    ticketId: {
      type: String,
      required: true,
      ref: "Tickets",
    },

    projectId: {
      type: String,
      required: true,
      ref: "Projects",
    },

    sprintId: {
      type: String,
      ref: "PartnerSprint",
      default: null,
    },

    // Who performed the activity?
    performedBy: {
      type: String,
      required: true,
      ref: "User",
    },

    // What kind of activity happened?
    activityType: {
      type: String,
      required: true,
      enum: [
        "TICKET_CREATED",
        "STATUS_UPDATED",
        "PRIORITY_UPDATED",
        "ASSIGNEE_UPDATED",
        "COMMENT_ADDED",
        "ATTACHMENT_ADDED",
        "TICKET_UPDATED",
        "SPRINT_CHANGED",
        "LABEL_UPDATED",
        "TIME_LOGGED",
      ],
    },

    // Before & After data (optional but extremely useful)
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Extra details (comment text, attachment url etc)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TicketActivity", ticketActivitySchema);
