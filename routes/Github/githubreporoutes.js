import express from "express";
import {
  listRepos,
  createRepo,
  listBranches,
  createBranch,
} from "../../controllers/Github/githubController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const githubrouter = express.Router();

// Repo management
githubrouter.get("/repos", listRepos);
githubrouter.post("/repos", createRepo);
githubrouter.post("/repos", createRepo);


// Branch management
githubrouter.get("/repos/:owner/:repo/branches", authenticateToken,listBranches);
githubrouter.post("/repos/:owner/:repo/branches",authenticateToken, createBranch);

export default githubrouter;
