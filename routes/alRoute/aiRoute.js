// routes/aiRoutes.js
import express from "express";
import { generateDeveloperVelocity, generateDeveloperBreakdown, generateTeamVelocity, compareRepoMetrics } from "../../controllers/Analytics/velocityController.js";
const aiRouter = express.Router();

aiRouter.get("/velocity", generateDeveloperVelocity); // ?owner=&repo=&since=&until=
aiRouter.get("/velocity/developer", generateDeveloperBreakdown); // ?owner=&repo=&since=&until=
aiRouter.get("/velocity/team", generateTeamVelocity); // ?repos=owner/repo,owner2/repo2&since=&until=
aiRouter.get("/velocity/compare", compareRepoMetrics); // ?owner=&repo=&sinceA=&untilA=&sinceB=&untilB=

export default aiRouter;
