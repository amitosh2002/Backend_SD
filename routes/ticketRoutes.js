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
  unassignTicket,
  getSortKeyValues,
  getCurrentProjectSprintWork,
  cloneTicket,
} from "../controllers/ticketController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/v1/tickets", authenticateToken, listTickets);
router.post("/v1/tickets/create", authenticateToken, createTicket);
router.post("/v2/tickets/create", authenticateToken, createTicketV2);

// Move specific routes BEFORE parameterized routes
router.get("/v1/tickets/sprint/work", authenticateToken, getCurrentProjectSprintWork);
router.get("/v1/tickets/fetch/searchTicket", authenticateToken, getTicketByQuery);
router.get("/v1/tickets/preview-key", previewTicketKey);
router.get("/v1/tickets/by-key/:key", authenticateToken, getTicketByKey);
router.get("/v1/tickets/getSortKeyValues/get", authenticateToken, getSortKeyValues);
router.post("/v1/tickets/time-log", authenticateToken, addTimeLog);
router.post("/v1/tickets/update/storyPoint", authenticateToken, addStoryPoint);

// Parameterized routes
router.get("/v1/tickets/:id", authenticateToken, getTicketById);
router.patch("/v1/tickets/update/:id", authenticateToken, updateTicket);
router.post("/v1/tickets/:id/status", authenticateToken, setStatus);
router.post("/v1/tickets/:id/assignee", authenticateToken, setAssignee);
router.post("/v1/tickets/:id/unassign", authenticateToken, unassignTicket);
router.post("/v1/tickets/:id/priority", authenticateToken, setPriority);
router.post("/v1/tickets/:id/labels/add", authenticateToken, addLabel);


//Tickets actions routes
// router.post("/v1/tickets/:id/delete", authenticateToken, deleteTicket);
// router.post("/v1/tickets/:id/move", authenticateToken, moveTicket);
// router.post("/v1/tickets/:id/convert-to-sub-task", authenticateToken, convertToSubTask);
// router.post("/v1/tickets/:id/convert-to-epic", authenticateToken, convertToEpic);
router.post("/v1/tickets/:ticketId/clone", authenticateToken, cloneTicket);

//==============Logs and other routes ========= 
router.post("/v1/tickets/getAll",authenticateToken,getWorkLogActivity)
router.get("/v1/tickets/getSortKeyValues/get",authenticateToken,getSortKeyValues)




export default router;
