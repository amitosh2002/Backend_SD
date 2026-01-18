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

export default router;





