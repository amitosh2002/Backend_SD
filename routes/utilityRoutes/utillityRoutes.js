import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getAllUserForProject } from "../../controllers/UtilityCoontroller/utilityControllerV1.js";

const utilityRouter= express.Router();


utilityRouter.post("/v1/utility/members/t",authenticateToken,getAllUserForProject)

export default utilityRouter;