import express from "express";
import {
  listRepos,
  createRepo,
  listBranches,
  createBranch,
  createBranchRecord,
  listBranchRecords,
  getBranchRecord,
  updateBranchRecord,
  deleteBranchRecord,
  getBranchDetails,
  getRepoBranchesAnalytics,
  getRepoBranchesAnalyticsFromDB,
  getProjectReposAnalytics,
  getProjectReposAnalyticsFromDB,
} from "../../controllers/Github/githubController.js";
import { saveGithubConfig, getGithubConfig } from "../../controllers/Github/githubConfigController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const githubrouter = express.Router();

// Repo management
githubrouter.get("/repos", authenticateToken, listRepos);
githubrouter.post("/repos", authenticateToken, createRepo);


// Branch management
githubrouter.get("/repos/:owner/:repo/branches", authenticateToken, listBranches);
githubrouter.post("/repos/:owner/:repo/branches", authenticateToken, createBranch);

// Branch records CRUD (DB records)
githubrouter.post('/branches/records', authenticateToken, createBranchRecord);
githubrouter.get('/branches/records', authenticateToken, listBranchRecords);
githubrouter.get('/branches/records/:id', authenticateToken, getBranchRecord);
githubrouter.put('/branches/records/:id', authenticateToken, updateBranchRecord);
githubrouter.delete('/branches/records/:id', authenticateToken, deleteBranchRecord);

// Branch details and analytics
githubrouter.get('/repos/:owner/:repo/branches/details', authenticateToken, getBranchDetails);
githubrouter.get('/repos/:owner/:repo/branches/analytics', authenticateToken, getRepoBranchesAnalytics);
githubrouter.get('/repos/:owner/:repo/branches/analytics/cache', authenticateToken, getRepoBranchesAnalyticsFromDB);
githubrouter.get('/repos/analytics/project/:projectId', authenticateToken, getProjectReposAnalytics);
githubrouter.get('/repos/analytics/project/:projectId/cache', authenticateToken, getProjectReposAnalyticsFromDB);

// Config Management
githubrouter.post('/config', authenticateToken, saveGithubConfig);
githubrouter.get('/config/:projectId', authenticateToken, getGithubConfig);

export default githubrouter;
