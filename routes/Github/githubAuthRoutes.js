import express from "express";
import { redirectToGithub, handleGithubCallback, setupInstallationGithub, webhookHandler, createBranchV3 } from "../../controllers/Github/githubAuthController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const githubAuthRouter = express.Router();

// Redirect user to GitHub
githubAuthRouter.get("/login", redirectToGithub);

// GitHub callback
githubAuthRouter.get("/callback", handleGithubCallback);

//Github Webhook routes
githubAuthRouter.post("/service/git-webhook",express.raw({ type: '*/*' }),webhookHandler)

// Github setup Url
githubAuthRouter.post("/github/setup",authenticateToken,setupInstallationGithub)


githubAuthRouter.post("/github/create-branch",authenticateToken,createBranchV3)


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