import express from "express";
import { createSprint, deactivateSprint, getSprintsForPartner, updateSprint } from "../../controllers/SprintController/sprintControllerV1.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";


const router = express.Router();

router.post("/create",authenticateToken,createSprint);
router.get("/:partnerId", authenticateToken,getSprintsForPartner);
router.put("/update/:sprintId",authenticateToken, updateSprint);
router.put("/deactivate/:sprintId", authenticateToken,deactivateSprint);

export default router;
