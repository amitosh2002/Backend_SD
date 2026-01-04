import mongoose from 'mongoose';

const BranchAnalyticsSchema = new mongoose.Schema({
  repoId: { type: String, index: true, required: true },
  branchName: { type: String, required: true },
  branchCreator: {
    id: String,
    login: String,
    name: String,
    email: String,
  },
  lastCommitSha: String,
  lastCommitDate: Date,
  prsCount: { type: Number, default: 0 },
  closedPrsCount: { type: Number, default: 0 },
  mergedPrsCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  buildRunsCount: { type: Number, default: 0 },
  buildFailuresCount: { type: Number, default: 0 },
  metadata: Object,
  lastSyncedAt: Date,
}, { timestamps: true });

BranchAnalyticsSchema.index({ repoId: 1, branchName: 1 }, { unique: true });
BranchAnalyticsSchema.index({ repoId: 1 });

export const BranchAnalyticsModel = mongoose.model('BranchAnalytics', BranchAnalyticsSchema);
export default BranchAnalyticsModel;
