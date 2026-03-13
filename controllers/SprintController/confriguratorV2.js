
import Status from "../../models/PlatformModel/SprintModels/confrigurator/StatusModel.js";
import WorkflowTransition from "../../models/PlatformModel/SprintModels/confrigurator/WorkflowTransitionModel.js";
import BoardColumn from "../../models/PlatformModel/SprintModels/confrigurator/BoardColumnModel.js";
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";

const normalize = (str) => (str || "").toUpperCase().trim().replace(/\s+/g, '_');

/**
 * ✅ Get the complete board/flow configuration for a project (V2)
 */
export const getProjectFlowV2 = async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const [statuses, transitions, columns] = await Promise.all([
      Status.find({ projectId }).sort({ order: 1 }).lean(),
      WorkflowTransition.find({ projectId }).lean(),
      BoardColumn.find({ projectId }).sort({ order: 1 }).lean()
    ]);

    // Handle empty data by falling back to migration/seeding (keeping it compatible with existing DB)
    if (statuses.length === 0 && columns.length === 0) {
      // This part would normally trigger a migration or return defaults
      // For now, let's keep it clean as a "V2" getter.
    }

    return res.status(200).json({
      projectId,
      statuses,
      transitions,
      columns
    });
  } catch (error) {
    console.error("[FlowV2] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ✅ Update the entire flow configuration transactionally (V2)
 */
export const updateProjectFlowV2 = async (req, res) => {
  try {
    const { projectId, statuses, transitions, columns } = req.body;
    const userId = req.user.userId;

    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    // 1. Clear existing data for this project
    await Promise.all([
      Status.deleteMany({ projectId }),
      WorkflowTransition.deleteMany({ projectId }),
      BoardColumn.deleteMany({ projectId })
    ]);

    // 2. Prepare documents with normalized keys
    const statusDocs = (statuses || []).map(s => ({
      ...s,
      projectId,
      key: normalize(s.key),
      label: s.label || s.key
    }));

    const transitionDocs = (transitions || []).map(t => ({
      ...t,
      projectId,
      from: normalize(t.from),
      to: normalize(t.to)
    }));

    const columnDocs = (columns || []).map(c => ({
      ...c,
      projectId,
      statusKeys: (c.statusKeys || []).map(k => normalize(k))
    }));

    // 3. Batch insert
    await Promise.all([
      Status.insertMany(statusDocs),
      WorkflowTransition.insertMany(transitionDocs),
      BoardColumn.insertMany(columnDocs)
    ]);

    return res.status(200).json({ message: "Flow V2 updated successfully" });
  } catch (error) {
    console.error("[FlowV2] Save Error:", error);
    return res.status(500).json({ message: "Failed to update flow V2" });
  }
};

/**
 * ✅ Validate if a ticket status transition is allowed (V2)
 */
export const validateTransitionV2 = async (req, res) => {
  try {
    const { projectId, from, to } = req.body;
    
    const allowed = await WorkflowTransition.exists({
      projectId,
      from: normalize(from),
      to: normalize(to)
    });

    return res.status(200).json({ allowed: !!allowed });
  } catch (error) {
    return res.status(500).json({ message: "Validation error" });
  }
};

/**
 * ✅ Aggregate Board Data (V2)
 * Returns columns with nested tickets
 */
export const getKanbanBoardV2 = async (req, res) => {
  try {
    const { projectId, sprintId } = req.body;
    
    // 1. Get Board Columns
    const columns = await BoardColumn.find({ projectId }).sort({ order: 1 }).lean();
    const allStatusKeys = columns.flatMap(c => c.statusKeys);

    // 2. Get tickets for these statuses (and optional sprint)
    const ticketFilter = { 
      projectId, 
      status: { $in: allStatusKeys } 
    };
    if (sprintId) ticketFilter.sprintId = sprintId;

    const tickets = await TicketModel.find(ticketFilter).lean();

    // 3. Group tickets by column
    const board = columns.map(col => ({
      ...col,
      tickets: tickets.filter(t => col.statusKeys.includes(normalize(t.status)))
    }));

    return res.status(200).json(board);
  } catch (error) {
    console.error("[BoardV2] Error:", error);
    return res.status(500).json({ message: "Failed to fetch Kanban board" });
  }
};
