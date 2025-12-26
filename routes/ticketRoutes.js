import express from "express";
import {
  createTicket,
  listTickets,
  getTicketById,
  updateTicket,
  addTimeLog,
  getTicketByKey,
  setStatus,
  setAssignee,
  setPriority,
  addLabel,
  removeLabel,
  previewTicketKey,
  createTicketV2,
  getTicketByQuery,
  addStoryPoint,
  getWorkLogActivity,
} from "../controllers/ticketController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/v1/tickets", listTickets);
router.post("/v1/tickets/create", createTicket);
router.post("/v2/tickets/create", createTicketV2);
router.get("/v1/tickets/:id", getTicketById);
router.patch("/v1/tickets/update/:id", updateTicket);
router.post("/v1/tickets/time-log", authenticateToken,addTimeLog);
router.get("/v1/tickets/by-key/:key", getTicketByKey);
router.get("/v1/tickets/preview-key", previewTicketKey);
router.post("/v1/tickets/:id/status", authenticateToken,setStatus);
router.post("/v1/tickets/:id/assignee", setAssignee);
router.post("/v1/tickets/:id/priority", setPriority);
router.post("/v1/tickets/:id/labels/add", addLabel);
router.post("/v1/tickets/:id/labels/add", addLabel);

router.get("/v1/tickets/fetch/searchTicket",authenticateToken, getTicketByQuery);
router.post("/v1/tickets/update/storyPoint",authenticateToken, addStoryPoint);


//==============Logs and other routes ========= 
router.post("/v1/tickets/getAll",authenticateToken,getWorkLogActivity)


export default router;
