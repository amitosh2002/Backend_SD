
import SprintBoardConfigSchema from "../../models/PlatformModel/SprintModels/confrigurator/sprintBoardModel.js"
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { buildDropdownConfigFromFlow } from "../../utility/platformUtility.js";

const normalize = (str) => (str || "").toUpperCase().trim().replace(/\s+/g, '_');

export const createBoardConfig = async (req, res) => {
  try {
    const { projectId, boardName, columns } = req.body;

    const board = await SprintBoardConfigSchema.create({
      projectId,
      boardName,
      columns,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ACTIVE BOARD FOR PROJECT
 */
export const getBoardConfigByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const board = await SprintBoardConfigSchema.findOne({
      projectId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE BOARD CONFIG
 */
export const updateBoardConfig = async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await SprintBoardConfigSchema.findByIdAndUpdate(
      boardId,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true }
    );

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * IMPORT BOARD FROM ANOTHER PROJECT
 */
export const importBoardFromProject = async (req, res) => {
  try {
    const { fromProjectId, toProjectId } = req.body;

    const sourceBoard = await SprintBoardConfigSchema.findOne({
      projectId: fromProjectId,
      isActive: true,
    });

    if (!sourceBoard) {
      return res.status(404).json({ message: "Source board not found" });
    }

    const importedBoard = await SprintBoardConfigSchema.create({
      projectId: toProjectId,
      boardName: sourceBoard.boardName,
      columns: sourceBoard.columns,
      workflowSource: "IMPORTED",
      importedFromProjectId: fromProjectId,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json(importedBoard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



//==============================. workFlow controller =======================
// import ScrumProjectFlow from "../models/ScrumProjectFlow.js";

/**
 * ✅ CREATE FLOW
 */
export const createFlow = async (req, res) => {
  try {
    const { projectId, flowName, columns, sourceType } = req.body;

    if (!columns || columns.length === 0) {
      return res.status(400).json({ message: "Columns are required" });
    }

    const flow = await ScrumProjectFlow.create({
      projectId: projectId || null,
      flowName,
      columns,
      sourceType: sourceType || "PROJECT",
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json(flow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ GET FLOWS (by project OR templates)
 */
export const getFlows = async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = projectId
      ? { projectId }
      : { projectId: null }; // reusable templates

    const flows = await ScrumProjectFlow.find(query).sort({
      createdAt: -1,
    });

    res.json(flows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ GET FLOW BY ID
 */
export const getFlowById = async (req, res) => {
  try {
    const flow = await ScrumProjectFlow.findById(req.params.id);
    if (!flow) {
      return res.status(404).json({ message: "Flow not found" });
    }
    res.json(flow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ UPDATE FLOW
 */
export const updateFlow = async (req, res) => {
  try {
    const updatedFlow = await ScrumProjectFlow.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!updatedFlow) {
      return res.status(404).json({ message: "Flow not found" });
    }

    res.json(updatedFlow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/**
 * ✅ IMPORT FLOW
 */
export const importFlow = async (req, res) => {
  try {
    const { sourceFlowId, targetProjectId } = req.body;

    const sourceFlow = await ScrumProjectFlow.findById(sourceFlowId);
    if (!sourceFlow) {
      return res.status(404).json({ message: "Source flow not found" });
    }

    const clonedFlow = await ScrumProjectFlow.create({
      projectId: targetProjectId,
      flowName: sourceFlow.flowName + " (Imported)",
      columns: sourceFlow.columns,
      sourceType: "IMPORTED",
      importedFromFlowId: sourceFlow._id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json(clonedFlow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importFlowFor = async (req, res) => {
  try {
    const { sourceFlowId, targetProjectId } = req.body;

    const sourceFlow = await ScrumProjectFlow.findById(sourceFlowId);
    if (!sourceFlow) {
      return res.status(404).json({ message: "Source flow not found" });
    }

    const clonedFlow = await ScrumProjectFlow.create({
      projectId: targetProjectId,
      flowName: sourceFlow.flowName + " (Imported)",
      columns: sourceFlow.columns,
      sourceType: "IMPORTED",
      importedFromFlowId: sourceFlow._id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json(clonedFlow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================================scrum confrigurtor  fixed and running =====

export const getScrumFlowForProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    // 1️⃣ Project-specific flow
    let flows = await ScrumProjectFlow.find({
      projectId,
      isActive: true,
      sourceType: "PROJECT",
    }).sort({ updatedAt: -1 }).lean();

    // 1.5 Clean duplicates if any (only keep the latest one)
    if (flows.length > 1) {
      const latestId = flows[0]._id;
      await ScrumProjectFlow.deleteMany({
        _id: { $ne: latestId },
        projectId,
        sourceType: "PROJECT"
      });
    }

    let flow = flows[0];

    // 2️⃣ Fallback to TEMPLATE
    if (!flow) {
      flow = await ScrumProjectFlow.findOne({
        projectId: "DEFAULT",
        isActive: true,
        sourceType: "TEMPLATE",
      }).lean();
    }

    if (!flow) {
      return res.status(404).json({
        message: "No scrum flow found",
      });
    }

    // 3️⃣ Standardize columns: Sort, Normalize and Deduplicate
    const standardizedColumns = (flow.columns || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((col, idx) => ({
        ...col,
        name: normalize(col.name),
        statusKeys: Array.from(new Set((col.statusKeys || []).map(k => normalize(k)))),
        order: idx
      }));

    const statusColors = {};
    const ticketFlowTypes = new Set(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "HOLD", "REOPEN"]);
    const finalWorkflow = {};

    // Collect all unique statuses for ticketFlowTypes and statusColors
    standardizedColumns.forEach((col) => {
      col.statusKeys.forEach(key => {
        const normKey = normalize(key);
        ticketFlowTypes.add(normKey);
        // Prefer the color of the FIRST column the status appears in
        if (!statusColors[normKey]) {
          statusColors[normKey] = {
            bg: `${col.color}22`,
            text: col.color,
            border: col.color,
          };
        }
      });
    });

    // A. Add Intra-Column Transitions (Statuses in the same column can move to each other)
    standardizedColumns.forEach(col => {
      col.statusKeys.forEach(status => {
        const normFrom = normalize(status);
        const otherStatuses = col.statusKeys.filter(s => normalize(s) !== normFrom).map(s => normalize(s));
        if (otherStatuses.length > 0) {
          finalWorkflow[normFrom] = Array.from(new Set([...(finalWorkflow[normFrom] || []), ...otherStatuses]));
        }
      });
    });

    // B. Add explicit status-level transitions (wires)
    Object.entries(flow.workflow || {}).forEach(([from, targets]) => {
      const normFrom = normalize(from);
      ticketFlowTypes.add(normFrom);
      const normTargets = (targets || []).map(t => {
        const nt = normalize(t);
        ticketFlowTypes.add(nt);
        return nt;
      });

      finalWorkflow[normFrom] = Array.from(new Set([...(finalWorkflow[normFrom] || []), ...normTargets]));
    });

    // Ensure all statuses in ticketFlowTypes have a color fallback
    const defaultPalette = {
      "OPEN": "#3b82f6",
      "IN_PROGRESS": "#f59e0b",
      "IN_REVIEW": "#6366f1",
      "DONE": "#10b981",
      "HOLD": "#f59e0b",
      "REOPEN": "#f97316",
    };

    ticketFlowTypes.forEach(key => {
      if (!statusColors[key]) {
        const baseColor = defaultPalette[key] || "#64748b";
        statusColors[key] = {
          bg: `${baseColor}22`,
          text: baseColor,
          border: baseColor
        };
      }
    });

    // C. Add transitions from column-level wiring
    Object.entries(flow.columnWorkflow || {}).forEach(([fromColId, targetColIds]) => {
      const fromCol = standardizedColumns.find(c => c.id === fromColId);
      if (!fromCol) return;

      const targetStatuses = (targetColIds || []).flatMap(tId => {
        const tCol = standardizedColumns.find(c => c.id === tId);
        return tCol ? tCol.statusKeys : [];
      }).map(s => normalize(s));

      if (targetStatuses.length > 0) {
        fromCol.statusKeys.forEach(s => {
          const normFrom = normalize(s);
          finalWorkflow[normFrom] = Array.from(new Set([...(finalWorkflow[normFrom] || []), ...targetStatuses]));
        });
      }
    });

    // 4️⃣ Default linear fallback (ONLY if no wires at all)
    const hasStatusWires = Object.keys(flow.workflow || {}).length > 0;
    const hasColWires = Object.keys(flow.columnWorkflow || {}).length > 0;

    if (!hasStatusWires && !hasColWires && standardizedColumns.length > 1) {
      // Strictly N -> N+1 fallback
      standardizedColumns.forEach((col, idx) => {
        const nextCol = standardizedColumns[idx + 1];
        if (!nextCol) return;
        const nextStatuses = (nextCol.statusKeys || []).map(s => normalize(s));
        
        col.statusKeys.forEach(status => {
          const normStatus = normalize(status);
          finalWorkflow[normStatus] = Array.from(new Set([...(finalWorkflow[normStatus] || []), ...nextStatuses]));
        });
      });
    }

    // Final cleanup: Remove any self-transitions that might have crept in
    Object.keys(finalWorkflow).forEach(k => {
      finalWorkflow[k] = (finalWorkflow[k] || []).filter(t => t !== k);
    });

    return res.status(200).json({
      projectId,
      source: "FLOW",
      flowId: flow._id || flow.id,
      boardName: flow.flowName,
      columns: standardizedColumns,
      statusColors,
      statusWorkflow: finalWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes).sort(),
      editable: true,
    });
  } catch (error) {
    console.error("[ScrumFlow] Error:", error);
    return res.status(500).json({
      message: "Failed to fetch scrum flow",
    });
  }
};

export const getSprintBoardForProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    // 1️⃣ Project board
    let board = await SprintBoardConfigSchema.findOne({
      projectId,
      isActive: true,
      workflowSource: "PROJECT",
    }).lean();

    // 2️⃣ Fallback to TEMPLATE
    if (!board) {
      board = await SprintBoardConfigSchema.findOne({
        projectId: "DEFAULT",
        isActive: true,
        workflowSource: "TEMPLATE",
      }).lean();
    }

    if (!board) {
      return res.status(404).json({
        message: "No sprint board found",
      });
    }

    // 3️⃣ Standardize columns
    const standardizedColumns = (board.columns || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(col => ({
        ...col,
        name: normalize(col.name),
        statusKeys: Array.from(new Set((col.statusKeys || []).map(k => normalize(k))))
      }));

    const statusColors = {};
    const statusWorkflow = {};
    const ticketFlowTypes = new Set(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "HOLD", "REOPEN"]);

    // 4️⃣ Build status context for Board (Strict Linear Default)
    standardizedColumns.forEach((col, idx) => {
      const nextCol = standardizedColumns[idx + 1];
      const nextStatuses = (nextCol?.statusKeys || []).map(s => normalize(s));

      col.statusKeys.forEach(statusKey => {
        const normKey = normalize(statusKey);
        ticketFlowTypes.add(normKey);

        // Linear Fallback: Status can move ONLY to statuses in the NEXT column
        // This makes the board flow strictly forward unless wires are drawn (not supported in simple Board mode)
        const existing = statusWorkflow[normKey] || [];
        statusWorkflow[normKey] = Array.from(new Set([...existing, ...nextStatuses])).filter(s => s !== normKey);

        if (!statusColors[normKey]) {
          statusColors[normKey] = {
            bg: `${col.color}22`,
            text: col.color,
            border: col.color,
          };
        }
      });
    });

    // Provide color fallback for all seeded/discovered statuses
    const defaultPalette = {
      "OPEN": "#3b82f6",
      "IN_PROGRESS": "#f59e0b",
      "IN_REVIEW": "#6366f1",
      "DONE": "#10b981",
      "HOLD": "#f59e0b",
      "REOPEN": "#f97316",
    };

    ticketFlowTypes.forEach(key => {
      if (!statusColors[key]) {
        const baseColor = defaultPalette[key] || "#64748b";
        statusColors[key] = {
          bg: `${baseColor}22`,
          text: baseColor,
          border: baseColor
        };
      }
    });

    return res.status(200).json({
      projectId,
      source: "BOARD",
      boardId: board._id || board.id,
      boardName: board.boardName,
      columns: standardizedColumns,
      statusColors,
      statusWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes).sort(),
      editable: true,
    });
  } catch (error) {
    console.error("[SprintBoard] Error:", error);
    return res.status(500).json({
      message: "Failed to fetch sprint board",
    });
  }
};

export const UpdateSprintFlowForProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId, flowBody } = req.body;
    const { columns, name } = flowBody;

    // 1. Verify Access
    const hasAccess = await UserWorkAccess.exists({
      projectId: projectId,
      userId: userId,
      accessType: { $gte: 200 },
      status: "accepted"
    });

    if (!hasAccess) {
      return res.status(403).json({ msg: "Unauthorized: Insufficient access level" });
    }

    // 2. Normalize Data to UPPERCASE and replace spaces with _
    const normalize = (str) => (str || "").toUpperCase().trim().replace(/\s+/g, '_');

    const normalizedName = normalize(name || "DEFAULT_FLOW");
    const normalizedColumns = (columns || []).map(col => ({
      ...col,
      name: normalize(col.name),
      statusKeys: (col.statusKeys || []).map(k => normalize(k))
    }));

    const normalizedWorkflow = {};
    if (flowBody.workflow) {
      Object.entries(flowBody.workflow).forEach(([from, targets]) => {
        normalizedWorkflow[normalize(from)] = (targets || []).map(t => normalize(t));
      });
    }

    // 3. Perform Update (Upsert ensures no duplicate project flows)
    await ScrumProjectFlow.updateOne(
      { projectId }, 
      {
        $set: {
          columns: normalizedColumns,
          flowName: normalizedName,
          workflow: normalizedWorkflow,
          updatedBy: userId,
          isActive: true,
          sourceType: "PROJECT"
        },
        $setOnInsert: {
          projectId,
          createdBy: userId,
          createdAt: new Date()
        },
      },
      { upsert: true }
    );

    return res.status(200).json({ msg: "Flow updated successfully (Normalized to UPPERCASE_WITH_UNDERSCORES)" });

  } catch (error) {
    console.error("UpdateSprintFlow Error:", error);
    return res.status(500).json({ msg: "Internal Server Error", error: error.message });
  }
};

/**
 * Save or update project board
 */
export const saveOrUpdateProjectBoard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { columns,projectId } = req.body; // columns from frontend
    console.log(columns,"from frontend")
    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ message: 'Invalid columns payload' });
    }

    // Normalize Data
    const normalize = (str) => (str || "").toUpperCase().trim().replace(/\s+/g, '_');
    const normalizedColumns = (columns || []).map(col => ({
      ...col,
      name: normalize(col.name),
      statusKeys: (col.statusKeys || []).map(k => normalize(k))
    }));

    // Replace the entire columns block with the one from the request body
    const updatedBoard = await SprintBoardConfigSchema.updateOne(
      { projectId: projectId }, // find by actual projectId
      {
        $set: { 
          columns: normalizedColumns, // Direct replacement
          updatedAt: new Date() 
        },
        $setOnInsert: {
          projectId: projectId,
          createdBy: userId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      message: 'Board saved successfully',
      data: updatedBoard
    });

  } catch (error) {
    console.error('Error saving board:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
};