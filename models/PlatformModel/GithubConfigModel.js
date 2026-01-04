import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const GithubConfigSchema = new mongoose.Schema({
    id: {
          type: String,
         default: () => uuidv4(),
    },
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  githubSecretCode: { // This is the GitHub Token provided by the user
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: String,
    ref: 'Users',
  },
}, { timestamps: true });

export const GithubConfigModel = mongoose.model('GithubConfig', GithubConfigSchema);
export default GithubConfigModel;
