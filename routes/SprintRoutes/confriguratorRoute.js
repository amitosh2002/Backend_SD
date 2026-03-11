import express from "express";
import { createBoardConfig, createFlow, getBoardConfigByProject, getFlowById, getFlows, getScrumFlowForProject, getSprintBoardForProject, importBoardFromProject, saveOrUpdateProjectBoard, updateBoardConfig, updateFlow, UpdateSprintFlowForProject } from "../../controllers/SprintController/confrigurator.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";


const router = express.Router();



/* ========= FLOW ========= */
router.post("/flow", authenticateToken,createFlow);
router.get("/flow",authenticateToken, getFlows);
router.get("/flow/:id", authenticateToken,getFlowById);
router.put("/flow/:id",authenticateToken, updateFlow);
router.post("/key-flow",authenticateToken,getScrumFlowForProject)
router.post("/key-flow/update",authenticateToken,UpdateSprintFlowForProject)
//============================= flow route ==================//



//============================= Board route ==================//
router.post("/key-board",authenticateToken,getSprintBoardForProject)
router.post("/board",authenticateToken, createBoardConfig);
router.get("/board/:projectId",authenticateToken, getBoardConfigByProject);
router.post("/key-board/update", authenticateToken,saveOrUpdateProjectBoard);
router.post("/board/import", authenticateToken,importBoardFromProject);
//============================= Board route ==================//

/* ========= V2 GRANULAR FLOW ========= */
import { getProjectFlowV2, updateProjectFlowV2, getKanbanBoardV2, validateTransitionV2 } from "../../controllers/SprintController/confriguratorV2.js";

router.post("/v2/key-flow", authenticateToken, getProjectFlowV2);
router.post("/v2/key-flow/update", authenticateToken, updateProjectFlowV2);
router.post("/v2/kanban", authenticateToken, getKanbanBoardV2);
router.post("/v2/validate", authenticateToken, validateTransitionV2);
/* =================================== */

export default router;





