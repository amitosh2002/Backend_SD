// import mongoose from "mongoose";

// const CounterSchema = new mongoose.Schema(
//   {
//     _id: { type: String, required: true }, // ticket type, e.g., PLAT, LIVEOPS
//     seq: { type: Number, default: 0 },
//   },
//   { timestamps: true }
// );

// export const CounterModel = mongoose.model("Counter", CounterSchema);

import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true, // This will be the ticket type (ARCH, BUG, etc.)
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get next sequence number
CounterSchema.statics.getNextSequence = async function (type) {
  try {
    const counter = await this.findByIdAndUpdate(
      type.toUpperCase(),
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  } catch (error) {
    console.error("Error getting next sequence:", error);
    throw error;
  }
};

// Static method to reset counter (use with caution)
CounterSchema.statics.resetCounter = async function (type) {
  try {
    await this.findByIdAndUpdate(
      type.toUpperCase(),
      { seq: 0 },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error("Error resetting counter:", error);
    throw error;
  }
};

// Static method to get current count without incrementing
CounterSchema.statics.getCurrentCount = async function (type) {
  try {
    const counter = await this.findById(type.toUpperCase());
    return counter ? counter.seq : 0;
  } catch (error) {
    console.error("Error getting current count:", error);
    return 0;
  }
};

export const CounterModel = mongoose.model("Counter", CounterSchema);
