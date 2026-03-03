import express from "express";
import { 
  redirectToGithub, 
  handleGithubCallback, 
  setupInstallationGithub, 
  webhookHandler, 
  createBranchV3, 
  getRepoBranchesV3, 
  getBranchDetailsV3,
  getReposV3,
  getGithubSystemStats,
  getGithubInstallationsList
} from "../../controllers/Github/githubAuthController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const githubAuthRouter = express.Router();

// Redirect user to GitHub
githubAuthRouter.get("/login", redirectToGithub);

// GitHub callback
githubAuthRouter.get("/callback", handleGithubCallback);

// Github Webhook routes
githubAuthRouter.post("/service/git-webhook", express.raw({ type: '*/*' }), webhookHandler);

// Github setup Url
githubAuthRouter.post("/setup", authenticateToken, setupInstallationGithub);

// Branch and Repo management (V3 flow)
githubAuthRouter.post("/create-branch", authenticateToken, createBranchV3);
githubAuthRouter.get("/repos", authenticateToken, getReposV3);
githubAuthRouter.get("/branches", authenticateToken, getRepoBranchesV3);
githubAuthRouter.get("/branch-details", authenticateToken, getBranchDetailsV3);

// System Monitoring
githubAuthRouter.get("/stats", authenticateToken, getGithubSystemStats);
githubAuthRouter.get("/installations", authenticateToken, getGithubInstallationsList);

export default githubAuthRouter;



// ////


// 🚀 NEXT LEVEL (OPTIONAL)
// I can help you add:


// 🔄 Webhook deduplication (delivery ID)


// 🧠 Async queue processing (BullMQ)


// 🔐 Replay attack protection


// 📦 Sync PRs to DB


// 🏢 Org + personal install handling


// Just say 👍