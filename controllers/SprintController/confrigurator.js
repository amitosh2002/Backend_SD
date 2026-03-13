import SprintBoardConfigSchema from "../../models/PlatformModel/SprintModels/confrigurator/sprintBoardModel.js"
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { buildDropdownConfigFromFlow } from "../../utility/platformUtility.js";

// New Granular Models
import Status from "../../models/PlatformModel/SprintModels/confrigurator/StatusModel.js";
import WorkflowTransition from "../../models/PlatformModel/SprintModels/confrigurator/WorkflowTransitionModel.js";
import BoardColumn from "../../models/PlatformModel/SprintModels/confrigurator/BoardColumnModel.js";

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

    // 1️⃣ Fetch from new granular collections
    const [statuses, transitions, columns] = await Promise.all([
      Status.find({ projectId }).sort({ order: 1 }).lean(),
      WorkflowTransition.find({ projectId }).lean(),
      BoardColumn.find({ projectId }).sort({ order: 1 }).lean()
    ]);

    let finalStatuses = statuses;
    let finalTransitions = transitions;
    let finalColumns = columns;
    let flowName = "Sprint Flow";
    let flowId = null;

    // 2️⃣ MIGRATION/SEEDING logic: If no granular data exists, fall back to ScrumProjectFlow
    if (finalStatuses.length === 0 && finalColumns.length === 0) {
      // Find project flow or template
      let existingFlow = await ScrumProjectFlow.findOne({ 
        projectId, 
        isActive: true, 
        sourceType: "PROJECT" 
      }).lean();

      if (!existingFlow) {
        existingFlow = await ScrumProjectFlow.findOne({ 
          projectId: "DEFAULT", 
          isActive: true, 
          sourceType: "TEMPLATE" 
        }).lean();
      }

      if (existingFlow) {
        flowName = existingFlow.flowName;
        flowId = existingFlow._id;
        
        // Convert to new format for processing and potentially seed later
        finalColumns = (existingFlow.columns || []).sort((a,b) => (a.order||0) - (b.order||0)).map(c => ({
          ...c,
          name: normalize(c.name),
          statusKeys: (c.statusKeys || []).map(k => normalize(k))
        }));

        const statusSet = new Set();
        finalColumns.forEach(c => c.statusKeys.forEach(k => statusSet.add(k)));
        
        // Seed default statuses if they were missing (important for your 'Manage Statuses' UI)
        ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "HOLD", "REOPEN"].forEach(s => statusSet.add(s));

        finalStatuses = Array.from(statusSet).map((s, idx) => ({
          projectId,
          key: s,
          label: s.replace(/_/g, ' '),
          order: idx,
          color: finalColumns.find(c => c.statusKeys.includes(s))?.color || "#3b82f6"
        }));

        finalTransitions = [];
        Object.entries(existingFlow.workflow || {}).forEach(([from, targets]) => {
          (targets || []).forEach(to => {
            finalTransitions.push({ from: normalize(from), to: normalize(to) });
          });
        });
      }
    } else {
      // Data exists in new format, get flow id from header record
      const header = await ScrumProjectFlow.findOne({ projectId, isActive: true }).lean();
      flowId = header?._id;
      flowName = header?.flowName || "Sprint Flow";
    }

    if (finalStatuses.length === 0 && finalColumns.length === 0) {
      return res.status(404).json({ message: "No scrum flow found" });
    }

    // 3️⃣ Build format expected by Frontend
    const standardizedColumns = finalColumns.map((col, idx) => ({
      ...col,
      id: col.id || col._id,
      name: normalize(col.name),
      statusKeys: Array.from(new Set((col.statusKeys || []).map(k => normalize(k)))),
      order: col.order ?? idx
    }));

    const statusColors = {};
    const ticketFlowTypes = new Set(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "HOLD", "REOPEN"]);
    const finalWorkflow = {};

    // Map status colors and ensure ticketFlowTypes
    finalStatuses.forEach(s => {
      const normKey = normalize(s.key);
      ticketFlowTypes.add(normKey);
      statusColors[normKey] = {
        bg: `${s.color || "#3b82f6"}22`,
        text: s.color || "#3b82f6",
        border: s.color || "#3b82f6",
      };
    });

    // A. Add Intra-Column Transitions (same column)
    standardizedColumns.forEach(col => {
      col.statusKeys.forEach(status => {
        const normFrom = normalize(status);
        const otherStatuses = col.statusKeys.filter(s => normalize(s) !== normFrom).map(s => normalize(s));
        if (otherStatuses.length > 0) {
          finalWorkflow[normFrom] = Array.from(new Set([...(finalWorkflow[normFrom] || []), ...otherStatuses]));
        }
      });
    });

    // B. Add Explicit Transitions (Wires - Wires might be stored in Transitions or old Flow.workflow)
    finalTransitions.forEach(t => {
      const normFrom = normalize(t.from);
      const normTo = normalize(t.to);
      ticketFlowTypes.add(normFrom);
      ticketFlowTypes.add(normTo);
      finalWorkflow[normFrom] = Array.from(new Set([...(finalWorkflow[normFrom] || []), normTo]));
    });

    // Ensure all statuses have color fallbacks
    const defaultPalette = {
      "OPEN": "#3b82f6", "IN_PROGRESS": "#f59e0b", "IN_REVIEW": "#6366f1", 
      "DONE": "#10b981", "HOLD": "#f59e0b", "REOPEN": "#f97316"
    };
    ticketFlowTypes.forEach(key => {
      if (!statusColors[key]) {
        const baseColor = defaultPalette[key] || "#64748b";
        statusColors[key] = { bg: `${baseColor}22`, text: baseColor, border: baseColor };
      }
    });

    // 4️⃣ Default forward fallback (if no wires)
    const hasTransitions = finalTransitions.length > 0;
    if (!hasTransitions && standardizedColumns.length > 1) {
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

    // Final cleanup (self-transitions)
    Object.keys(finalWorkflow).forEach(k => {
      finalWorkflow[k] = (finalWorkflow[k] || []).filter(t => t !== k);
    });

    return res.status(200).json({
      projectId,
      source: "FLOW",
      flowId,
      boardName: flowName,
      columns: standardizedColumns,
      statusColors,
      statusWorkflow: finalWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes).sort(),
      editable: true,
    });
  } catch (error) {
    console.error("[ScrumFlow] Error:", error);
    return res.status(500).json({ message: "Failed to fetch scrum flow" });
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
    const { columns, name, workflow, columnWorkflow } = flowBody;

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

    const normalize = (str) => (str || "").toUpperCase().trim().replace(/\s+/g, '_');
    const normalizedName = normalize(name || "DEFAULT_FLOW");

    // 2. Clear old data to rewrite (Transaction-like behavior)
    // In a real production app, use actual MongoDB transactions
    await Promise.all([
      BoardColumn.deleteMany({ projectId }),
      WorkflowTransition.deleteMany({ projectId }),
      Status.deleteMany({ projectId })
    ]);

    // 3. Save Board Columns and collect status keys
    const allStatusKeys = new Set();
    const columnDocs = (columns || []).map((col, idx) => {
      const normKeys = (col.statusKeys || []).map(k => normalize(k));
      normKeys.forEach(k => allStatusKeys.add(k));
      const rawColor = col.color || "#3b82f6";
      const resolvedColor = typeof rawColor === 'object' ? (rawColor.text || rawColor.bg || "#3b82f6") : (rawColor || "#3b82f6");
      return {
        projectId,
        name: normalize(col.name),
        statusKeys: normKeys,
        color: resolvedColor,
        order: idx,
        wipLimit: col.wipLimit
      };
    });
    const savedColumns = await BoardColumn.insertMany(columnDocs);

    // 4. Save Workflow Transitions (Wires)
    const transitionDocs = [];
    if (workflow) {
      Object.entries(workflow).forEach(([from, targets]) => {
        (targets || []).forEach(to => {
          allStatusKeys.add(normalize(from));
          allStatusKeys.add(normalize(to));
          transitionDocs.push({
            projectId,
            from: normalize(from),
            to: normalize(to),
            type: "forward"
          });
        });
      });
    }

    // Handle column-level wiring by expanding to all status combinations
    if (columnWorkflow) {
      Object.entries(columnWorkflow).forEach(([fromColId, targetColIds]) => {
        const fromCol = savedColumns.find(c => c._id.toString() === fromColId || c.name === normalize(fromColId));
        if (!fromCol) return;
        (targetColIds || []).forEach(tId => {
          const tCol = savedColumns.find(c => c._id.toString() === tId || c.name === normalize(tId));
          if (!tCol) return;
          fromCol.statusKeys.forEach(fKey => {
            tCol.statusKeys.forEach(tKey => {
              transitionDocs.push({
                projectId,
                from: fKey,
                to: tKey,
                type: "forward"
              });
            });
          });
        });
      });
    }
    if (transitionDocs.length > 0) {
      await WorkflowTransition.insertMany(transitionDocs);
    }

    // 5. Save Statuses (Seeding from project usages + defaults)
    ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "HOLD", "REOPEN"].forEach(s => allStatusKeys.add(s));
    
    const statusDocs = Array.from(allStatusKeys).map((key, idx) => ({
      projectId,
      key,
      label: key.replace(/_/g, ' '),
      color: savedColumns.find(c => c.statusKeys.includes(key))?.color || "#64748b",
      category: key === "DONE" ? "done" : (key === "OPEN" ? "todo" : "active"),
      order: idx
    }));
    await Status.insertMany(statusDocs);

    // 6. Update the header record (ScrumProjectFlow) for metadata
    await ScrumProjectFlow.updateOne(
      { projectId }, 
      {
        $set: {
          flowName: normalizedName,
          columns: columns || [], // Keep for backward sync if needed
          workflow: workflow || {},
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

    return res.status(200).json({ msg: "Flow migrated and updated to new architecture successfully" });

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