import mongoose from 'mongoose';

const GithubInstallationSchema = new mongoose.Schema({
  installationId: { type: Number, required: true, unique: true },
  appId: Number,
  account: { // owner of installation (user or organization)
    id: String,
    login: String,
    type: String,
  },
  partnerId: { type: String, ref: 'Partner', index: true },
  connectedBy: { type:String, ref: 'User' },
  isActive: { type: Boolean, default: true },
  permissions: Object,
  accessTokenRef: { type: String, default: "" }, // optional reference to token storage or secrets manager. Avoid storing raw tokens in DB for production.
  lastRefreshedAt: Date,
  // configuration: allowed repo scopes, allowed events, etc
  config: Object,
}, { timestamps: true });

GithubInstallationSchema.index({ partnerId: 1, installationId: 1 });

export const GithubInstallationModel = mongoose.model('GithubInstallation', GithubInstallationSchema);
export default GithubInstallationModel;
