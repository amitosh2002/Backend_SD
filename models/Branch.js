import mongoose from 'mongoose';

const BranchSchema = new mongoose.Schema({
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  branchName: { type: String, required: true },
  meta: { type: Object },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

BranchSchema.index({ owner: 1, repo: 1, branchName: 1 }, { unique: true });

export default mongoose.model('Branch', BranchSchema);
