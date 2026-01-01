
import SprintBoardConfigSchema from "../../models/PlatformModel/SprintModels/confrigurator/sprintBoardModel.js"
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { buildDropdownConfigFromFlow } from "../../utility/platformUtility.js";
// import SprintBoardConfigSchema from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js"
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

    console.log("[ScrumFlow] Fetching flow for project:", projectId);

    // 1️⃣ Project-specific flow
    let flow = await ScrumProjectFlow.findOne({
      projectId,
      isActive: true,
      sourceType: "PROJECT",
    }).lean();
    // 2️⃣ Fallback to TEMPLATE
    if (!flow) {
      console.log("[ScrumFlow] Using TEMPLATE flow");
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

    /**
     * 3️⃣ Normalize FLOW → Board-like structure
     * Each status becomes its own column (editable later)
     * Be defensive: `ticketFlowTypes` may not exist on older documents — derive from `flow.columns`.
     */
    const derivedStatuses = Array.isArray(flow.ticketFlowTypes)
      ? flow.ticketFlowTypes
      : Array.from(new Set((flow.columns || []).flatMap((c) => c.statusKeys || [])));

    if (!derivedStatuses || derivedStatuses.length === 0) {
      // No statuses found — return a helpful 404 to the client
      return res.status(404).json({ message: "No statuses found in flow" });
    }

    // const columns = derivedStatuses.map((status, index) => ({
    //   columnId: `flow_col_${index + 1}`,
    //   name: (status || '').toString().replaceAll("_", " "),
    //   statusKeys: [status],
    //   color: (flow.statusColors && flow.statusColors[status]) || flow.columns?.[index]?.color || "#6366f1",
    //   wipLimit: null,
    //   order: index + 1,
    // }));
    // const columns = flow.columns;
    const columns= flow.columns.map((item,idx)=>({
      columnId: `flow_col_${idx + 1}`,
      name: (item.name || '').toString().replaceAll("_", " "),
      statusKeys: item.statusKeys,
      color: item.color,
      wipLimit: null,
      order: idx + 1,
    }))




    console.log(columns,"columns")

    // 4️⃣ Generate statusColors & statusWorkflow
// 4️⃣ Generate statusColors & statusWorkflow
// 4️⃣ Generate statusColors & statusWorkflow (INDEX ORDER PRESERVED)
// 4️⃣ Generate statusColors & statusWorkflow
const statusColors = {};
const statusWorkflow = {};
const ticketFlowTypes = new Set();

// columns are already ordered by index
columns.forEach((col, index) => {
  // keep column order
  ticketFlowTypes.add(col.name);

  // ✅ store statusKeys as an ordered array
  statusWorkflow[col.name] = [...col.statusKeys.filter((item)=>item!==col.name)];

  // colors per column
  statusColors[col.name] = {
    bg: `${col.color}22`,
    text: col.color,
    border: col.color,
  };
});


    // columns.forEach((column, idx) => {
    //   const currentStatuses = column.statusKeys;
    //   const nextStatuses = columns[idx + 1]?.statusKeys || [];

    //   currentStatuses.forEach((status) => {
    //     ticketFlowTypes.add(status);

    //     // Assign colors per column
    //     statusColors[status] = {
    //       bg: `${column.color}22`, // background with opacity
    //       text: column.color,
    //       border: column.color,
    //     };

    //     // Status can move to any status in current + next column, except itself
    //     statusWorkflow[status] = Array.from(
    //       new Set([...currentStatuses, ...nextStatuses])
    //     ).filter((s) => s !== status);
    //   });
    // });

    return res.status(200).json({
      projectId,
      source: "FLOW",
      flowId: flow.id,
      boardName: flow.flowName,
      columns,
      statusColors,
      statusWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes),
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

    console.log("[SprintBoard] Fetching board for project:", projectId);

    // 1️⃣ Project board
    let board = await SprintBoardConfigSchema.findOne({
      projectId,
      isActive: true,
      workflowSource: "PROJECT",
    }).lean();

    // 2️⃣ Fallback to TEMPLATE
    if (!board) {
      console.log("[SprintBoard] Using TEMPLATE board");
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

    // 3️⃣ Normalize & preserve column order
    const columns = (board.columns || [])
      .map((item, idx) => ({
        columnId: `board_col_${idx + 1}`,
        name: (item.name || "").toString().replaceAll("_", " "),
        statusKeys: Array.isArray(item.statusKeys) ? item.statusKeys : [],
        color: item.color || "#6366f1",
        wipLimit: item.wipLimit ?? null,
        order: idx + 1,
      }))
      .sort((a, b) => a.order - b.order);

    // 4️⃣ Generate statusColors & statusWorkflow (SAME AS FLOW)
    const statusColors = {};
    const statusWorkflow = {};
    const ticketFlowTypes = new Set();

    columns.forEach((col) => {
      // Track column names
      ticketFlowTypes.add(col.name);

      // ✅ workflow = statusKeys (FILTER SELF IF PRESENT)
      statusWorkflow[col.name] = col.statusKeys.filter(
        (status) => status !== col.name
      );

      // Assign colors per column
      statusColors[col.name] = {
        bg: `${col.color}22`,
        text: col.color,
        border: col.color,
      };
    });

    return res.status(200).json({
      projectId,
      source: "BOARD",
      boardId: board.id,
      boardName: board.boardName,
      columns,
      statusColors,
      statusWorkflow,
      ticketFlowTypes: Array.from(ticketFlowTypes),
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
    console.log(flowBody)

    // 1. Verify Access
    const hasAccess = await UserWorkAccess.exists({
      projectId: projectId,
      userId: userId,
      accessType: { $gte: 200 }, // Fixed: $gte for access level
      status: "accepted"
    });

    if (!hasAccess) {
      return res.status(403).json({ msg: "Unauthorized: Insufficient access level" });
    }

    // 2. Perform Update 
    // We filter by projectId, then set the new data
         await ScrumProjectFlow.updateOne(
          { projectId }, // Filter
          {
            $set: {
              columns,
              flowName: name,
            },
            $setOnInsert: {
              projectId,
              createdBy: userId,
              createdAt: new Date(),
            },
          },
          { upsert: true } // if the not found then create one 
        );



    // if (updateResult.matchedCount === 0) {
    //   return res.status(404).json({ msg: "Project flow mapping not found" });
    // }

    // 3. Log Activity (Optional but recommended for Scrum)
    // await logActivity({ actor: userId, action: 'UPDATE', targetEntity: 'FLOW', projectId });

    return res.status(200).json({ msg: "Flow updated successfully" });

  } catch (error) {
    console.error("UpdateSprintFlow Error:", error);
    return res.status(500).json({ msg: "Internal Server Error", error: error.message });
  }
};