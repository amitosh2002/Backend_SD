import express from "express";
import { getNotificationForUser, informScrumMasterNotification, notificationMarkAsRead, noficationAnalytics } from "../../controllers/NotificationController/inAppnotificationcontroller.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const inAppNotificationRoute = express.Router();

inAppNotificationRoute.get("/v1/plat/notification/getAll",authenticateToken, getNotificationForUser);
inAppNotificationRoute.post("/v1/plat/notification/markAsRead",authenticateToken, notificationMarkAsRead);
inAppNotificationRoute.post("/v1/plat/notification/informScrumMaster",authenticateToken, informScrumMasterNotification);
inAppNotificationRoute.get("/v1/plat/notification/getAnalytics",authenticateToken, noficationAnalytics);

export default inAppNotificationRoute;