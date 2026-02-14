import mongoose from 'mongoose';

const GithubRepoSchema = new mongoose.Schema({
  repoId: { // GitHub repository ID (numeric or string)
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  fullName: { // owner/name
    type: String,
    index: true,
  },
  name: {
    type: String,
  },
  owner: {
    id: String,
    login: String,
    type: String,
    avatarUrl: String,
  },
  htmlUrl: String,
  cloneUrl: String,
  sshUrl: String,
  description: String,
  defaultBranch: String,
  private: Boolean,
  fork: Boolean,
  language: String,
  topics: [String],
  size: Number,
  watchersCount: Number,
  stargazersCount: Number,
  forksCount: Number,
  openIssuesCount: Number,

  // Multi-tenant mapping
  partnerId: {
    type: String,
    index: true,
    ref: 'Partner',
    default:"WEBSITE"
  },
  projectId: {
    type: String,
    index: true,
    ref: 'Projects',
    required: true,
  },

  // Who connected this repo (userId)
  connectedBy: {
    type: String,
    ref: 'User',
  },

  // GitHub App / Installation info (if used)
  installationId: { type: Number },
  appId: { type: Number },

  // Webhook information for sync/CI triggers
  webhook: {
    id: String,
    url: String,
    events: [String],
    active: { type: Boolean, default: true },
  },

  // Branch metadata (if needed later)
  branches: [
    {
      name: String,
      lastCommitSha: String,
      lastCommitMessage: String,
      lastCommitDate: Date,
    },
  ],

  lastSyncedAt: Date,
  metadata: Object,

}, { timestamps: true });

// indexes for queries by partner and project
GithubRepoSchema.index({ partnerId: 1, projectId: 1 });
GithubRepoSchema.index({ repoId: 1 }, { unique: true });

export const GithubRepoModel = mongoose.model('GithubRepository', GithubRepoSchema);
export default GithubRepoModel;
