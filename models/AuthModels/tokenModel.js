import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

tokenSchema.index({ token: 1, isRevoked: 1 });

const TokenModel = mongoose.model("Token", tokenSchema);

export default TokenModel;


