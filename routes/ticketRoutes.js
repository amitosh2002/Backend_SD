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
} from "../controllers/ticketController.js";

const router = express.Router();

router.get("/v1/tickets", listTickets);
router.post("/v1/tickets/create", createTicket);
router.post("/v2/tickets/create", createTicketV2);
router.get("/v1/tickets/:id", getTicketById);
router.patch("/v1/tickets/update/:id", updateTicket);
router.post("/v1/tickets/time-log", addTimeLog);
router.get("/v1/tickets/by-key/:key", getTicketByKey);
router.get("/v1/tickets/preview-key", previewTicketKey);
router.post("/v1/tickets/:id/status", setStatus);
router.post("/v1/tickets/:id/assignee", setAssignee);
router.post("/v1/tickets/:id/priority", setPriority);
router.post("/v1/tickets/:id/labels/add", addLabel);
router.post("/v1/tickets/:id/labels/remove", removeLabel);

export default router;
