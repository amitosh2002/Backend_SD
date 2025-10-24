
import mongoose from "mongoose";
import { uuid } from "uuidv4";
// ============================================
// PARTNER MODEL
// ============================================
const Partner = new mongoose.Schema({
    partnerId:{
        type: String,
        required: true,
        unique: true,
        default: () => uuid(),  // ✅ Auto-generate UUID

    },
    partnerCode:{
        type: String,
        required: true,
        unique: true,
    },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    // required: true,
    select: false, // Don't return password by default in queries
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'retail', 'service', 'healthcare', 'other'],
    required: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  businessRegistration: {
    registrationNumber: String,
    gstNumber: String,
    panNumber: String,
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
  },
  onboardingStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  verificationDocuments: [
    {
      documentType: String,
      documentUrl: String,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
    },
  ],
  commissionRate: {
    type: Number,
    default: 15, // Percentage
  },
  rating: {
    average: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
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

// Indexes for faster queries
Partner.index({ email: 1 });
Partner.index({ phone: 1 });
Partner.index({ onboardingStatus: 1 });

export const PartnerModel = mongoose.model("Partner", Partner);