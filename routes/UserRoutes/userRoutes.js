import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getUserRescentWork, getUserTeamDetails, getUserTimeLog, getUserWorkDetails } from "../../controllers/UserController/userController.js";
 const routes = express.Router();

 routes.post("/v1/recent/user-work",authenticateToken,getUserRescentWork)
 routes.post("/v1/recent/user-timeLogs",authenticateToken,getUserTimeLog)
routes.get("/v1/platform/members", authenticateToken,getUserTeamDetails)
routes.post("/v1/platform/work", authenticateToken,getUserWorkDetails)
 

export default  routes;