import mongoose from "mongoose";
import { uuid } from "uuidv4";

const Projects = new mongoose.Schema({
  projectId: {
    type: String,            
    required: true,
    unique: true,
    default: () => uuid(),  // ✅ Auto-generate UUID
  },
  partnerId: {
    type:String,
    ref: 'Partner',
    required: true,
    index: true, // Important for filtering partner's projects
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  partnerCode: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: Object,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'completed', 'cancelled'],
    default: 'draft',
  },
  category: {
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
