import mongoose from "mongoose";
const AnalyticMappingSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  /** 1️⃣ Effort & Velocity Mapping */
  effortConfig: {
    field: { type: String, default: 'estimatePoints' },
    unit: { type: String, enum: ['points', 'hours', 'count'], default: 'points' }
  },

  /** 2️⃣ Workflow Status Mapping */
  statusMapping: {
    todo: [{ type: String }],
    inProgress: [{ type: String }],
    testing: [{ type: String }],
    done: [{ type: String }]
  },

  /** 3️⃣ DORA Metric Mapping */
  doraConfig: {
    leadTime: {
      startStatus: { type: String, default: 'OPEN' },
      endStatus: { type: String, default: 'DONE' },
      startDateField: { type: String, default: 'createdAt' },
      endDateField: { type: String, default: 'deployedAt' }
    },

    deployment: {
      successStatus: { type: String, default: 'LIVE' },
      deploymentDateField: { type: String, default: 'deployedAt' }
    },

    incident: {
      incidentStatus: { type: String, default: 'INCIDENT' },
      recoveryStatus: { type: String, default: 'RECOVERED' },
      incidentStartField: { type: String, default: 'incidentStartedAt' },
      recoveryEndField: { type: String, default: 'incidentResolvedAt' }
    },

    failure: {
      rollbackStatus: { type: String, default: 'ROLLED_BACK' }
    }
  },

  /** 4️⃣ Audit */
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

const AnalyticMapping = mongoose.model('AnalyticMapping', AnalyticMappingSchema);
export default AnalyticMapping;
