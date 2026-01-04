import express from "express";
import { assignSprintToProjectTicket, createSprint, deactivateSprint, getProjectSprintOverview, getSprintForProject, getSprintsForPartner, startSprintManually, updateSprint } from "../../controllers/SprintController/sprintControllerV1.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";


const router = express.Router();

router.post("/create",authenticateToken,createSprint);
router.get("/:partnerId", authenticateToken,getSprintsForPartner);
router.post("/getSprint", authenticateToken,getSprintForProject);
router.put("/update/:sprintId",authenticateToken, updateSprint);
router.post("/getAll",authenticateToken, startSprintManually);
router.put("/deactivate/:sprintId", authenticateToken,deactivateSprint);
router.post("/assignTicketToSprint/:sprintId/sprint", authenticateToken,assignSprintToProjectTicket);
router.post("/allsprint",authenticateToken,getProjectSprintOverview)


// analytics routes 


export default router;
