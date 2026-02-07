import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";


const Projects = new mongoose.Schema({
  projectId: {
    type: String,            
    required: true,
    unique: true,
    // default: () => uuid(),  // ✅ Auto-generate UUID
    default: () => uuidv4(),
  },
  partnerId: {
    type:String,
    ref: 'Partner',
    required: true,
    index: true, // Important for filtering partner's projects
  },
  projectName: {
    type: String,
    required: true,
    trim: true,
  },
  partnerCode: {
    type: String,
    required: true,
    trim: true,
  },
  teamSize:{
    type:String,
    require:true,
  },
  description: {
    type: Object,
    required: true,
  },
  isArchived: {
    type: Boolean,
    required: false,
    default: false,
  },
  startDate: {
    type: Date,
    // required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'completed', 'cancelled'],
    default: 'draft',
  },
  projectType: {
    type: String,
    trim: true,
  },
  endDate: {
    type: Date,
  },
  budget: {
    type: Number,
  },
  images: [
    {
      url: String,
      altText: String,
    },
  ],
services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId, // This is crucial for linking
      ref: 'Service', // MUST match the name: mongoose.model('Service', ...)
      required: true
    },
    // Optional: Add extra metadata if needed (e.g., date added)
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for partner-specific queries
Projects.index({ partnerId: 1, status: 1 });
Projects.index({ partnerId: 1, createdAt: -1 });

export const ProjectModel = mongoose.model("Projects", Projects);
