import mongoose from 'mongoose';
import { LogActionType, LogEntityType } from './Enums/ActivityLogEnum.js';

const ActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      ref: 'Project',
      required: false,
      index: true,
    },
    actionType: {
      type: String,
      enum: LogActionType,
      required: true,
    },
    targetType: {
      type: String,
      enum: LogEntityType,
      required: true,
    },
    targetId: {
      type: String, // could be ObjectId, UUID, or any unique identifier
      required: false,
    },
    description: {
      type: String, // optional human-readable summary
    },
    changes: 
      {
        // change: { type: String, required: true }, // field name that changed
        prevValue:{
          type:Object,
          default:null,
        }, // previous value
        newValue: {
          type:Object,
          default:null,
        }, // new value
      },
    
    metadata: {
      type: Object, // extra info, like links, tags, or custom data
      default: {},
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'activity_logs',
  }
);

// Optional: compound index for faster queries
// ActivityLogSchema.index({ projectId: 1, userId: 1, createdAt: -1 });

// export default ActivityLogSchema = mongoose.model('ActivityLog', ActivityLogSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

export default ActivityLog;

