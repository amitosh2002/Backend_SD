import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getUserCalanderTimeline, getUserRescentWork, getUserTeamDetails, getUserTimeLog, getUserWorkDetails, sendreportFordiscord } from "../../controllers/UserController/userController.js";
 const routes = express.Router();

 routes.post("/v1/recent/user-work",authenticateToken,getUserRescentWork)
 routes.post("/v1/recent/user-timeLogs",authenticateToken,getUserTimeLog)
routes.get("/v1/platform/members", authenticateToken,getUserTeamDetails)
routes.post("/v1/platform/work", authenticateToken,getUserWorkDetails)
routes.post("/v1/platform/report",sendreportFordiscord)
routes.get("/v1/user/calendar-timeline", authenticateToken, getUserCalanderTimeline)
 

export default  routes;