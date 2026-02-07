import { 
  getAllServices, 
  getService, 
  createService, 
  updateService, 
  deleteService 
} from "../../controllers/HoraInternal/serviceController.js";
import {
  getProjectServices,
  subscribeProjectToService,
  updateProjectSubscription,
  unsubscribeProjectFromService
} from "../../controllers/PlatformModel/projectServiceController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import express from "express";

const serviceRoutes = express.Router();

/**
 * Global Service Routes (Internal/Admin)
 * Base URL: /api/hora/v1/services
 */

serviceRoutes.get("/", authenticateToken, getAllServices);
serviceRoutes.get("/:identifier", authenticateToken, getService);
serviceRoutes.post("/", authenticateToken, createService);
serviceRoutes.put("/:serviceId", authenticateToken, updateService);
serviceRoutes.delete("/:serviceId", authenticateToken, deleteService);

/**
 * Project Service Routes
 * Base URL: /api/hora/v1/services/projects
 */
serviceRoutes.get("/projects/:projectId/services", authenticateToken, getProjectServices);
serviceRoutes.post("/projects/:projectId/services", authenticateToken, subscribeProjectToService);
serviceRoutes.put("/projects/:projectId/services/:serviceId", authenticateToken, updateProjectSubscription);
serviceRoutes.delete("/projects/:projectId/services/:serviceId", authenticateToken, unsubscribeProjectFromService);

export default serviceRoutes;
