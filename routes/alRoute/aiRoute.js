// routes/aiRoutes.js
import express from "express";
import { generateDeveloperVelocity } from "../../controllers/Analytics/velocityController.js";
const aiRouter = express.Router();

aiRouter.get("/velocity", generateDeveloperVelocity); // ?owner=&repo=&since=&until=

export default aiRouter;
