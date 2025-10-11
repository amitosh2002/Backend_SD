import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getUserRescentWork, getUserTimeLog } from "../../controllers/UserController/userController.js";
  const routes = express.Router();

 routes.post("/v1/recent/user-work",authenticateToken,getUserRescentWork)
 routes.post("/v1/recent/user-timeLogs",authenticateToken,getUserTimeLog)

export default  routes;