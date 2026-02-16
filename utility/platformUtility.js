import partnerSprint from "../models/PlatformModel/SprintModels/partnerSprint.js";
import { TicketModel } from "../models/TicketModels.js";
import SprintBoardConfig from "../models/PlatformModel/SprintModels/confrigurator/sprintBoardModel.js"
import ScrumProjectFlow from "../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js"
import AnalyticMapping from "../models/AnalyticsModels/AnalyticsMappingFields.js"

export function getWeekNumber(date) {

  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (0=Sun, 1=Mon, etc.)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of the year
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  // Calculate full weeks to the nearest Thursday
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Aggregates time logs to find the total minutes logged for each day of the week.
 *
 * @param {Array<Object>} timeLogs - Array of time log objects ({ minutes, at }).
 * @returns {Object} An object mapping day names to total minutes (e.g., { 'Monday': 150, 'Tuesday': 0, ... }).
 */
export function getWeeklyDayLogTime(timeLogs) {
  // Initialize the results map with all days set to 0 minutes
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];
  
  // Use a map or a plain object to store the running totals
  const dailyTotals = dayNames.reduce((acc, day) => {
    acc[day] = 0;
    return acc;
  }, {});

  timeLogs.forEach(log => {
    // 1. Parse the date
    const logDate = new Date(log.at);

    // 2. Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayIndex = logDate.getDay();
    const dayName = dayNames[dayIndex];

    // 3. Aggregate the minutes
    const minutes = log.minutes || 0; // Ensure minutes is treated as a number
    
    // Add the minutes to the correct day's total
    dailyTotals[dayName] += minutes;
  });

  // Optional: Convert minutes to hours for cleaner display
  const dailyHours = {};
  for (const day in dailyTotals) {
      dailyHours[day] = {
          totalMinutes: dailyTotals[day],
          totalHours: (dailyTotals[day] / 60).toFixed(2)
      };
  }

  return dailyHours;
}

/**
 * Analyzes time logs to calculate aggregates for both the current week and the current month.
 *
 * @param {Array<Object>} allTimeLogs - Flattened array of all time log entries.
 * @returns {Object} Contains 'currentWeek' and 'currentMonth' analysis objects.
 */
export function analyzeCurrentWeekAndMonthLogs(allTimeLogs) {
    const dayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"
    ];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDay();
    
    // --- 1. Define Date Ranges ---
    
    // WEEK RANGE (Monday to Sunday)
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(year, month, diffToMonday);
    weekStart.setHours(0, 0, 0, 0); 
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // MONTH RANGE (First day to Last day)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999); 

    const weekStartTime = weekStart.getTime();
    const weekEndTime = weekEnd.getTime();
    const monthStartTime = monthStart.getTime();
    const monthEndTime = monthEnd.getTime();
    
    // --- 2. Initialize Aggregators ---
    let currentWeekTotalMinutes = 0;
    let currentMonthTotalMinutes = 0;
    
    // Daily totals map is used for both (since they both group by day of week)
    const weekDailyTotalsMap = dayNames.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
    const monthDailyTotalsMap = dayNames.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});

    // --- 3. Filter and Aggregate in a Single Loop ---
    for (const log of allTimeLogs) {
        if (!log || typeof log.minutes !== 'number' || !log.at) continue;

        const logDate = new Date(log.at);
        const logTime = logDate.getTime();
        const minutes = log.minutes;
        const dayIndex = logDate.getDay();
        const dayName = dayNames[dayIndex];

        // Check for WEEK range inclusion
        if (logTime >= weekStartTime && logTime <= weekEndTime) {
            currentWeekTotalMinutes += minutes;
            weekDailyTotalsMap[dayName] += minutes;
        }

        // Check for MONTH range inclusion
        if (logTime >= monthStartTime && logTime <= monthEndTime) {
            currentMonthTotalMinutes += minutes;
            monthDailyTotalsMap[dayName] += minutes;
        }
    }
    
    // --- 4. Format Helper (to keep output concise) ---
    const formatAggregates = (totalsMap) => {
        const aggregates = {};
        for (const day in totalsMap) {
            const totalMinutes = totalsMap[day];
            aggregates[day] = {
                totalMinutes: totalMinutes,
                totalHours: (totalMinutes / 60).toFixed(2)
            };
        }
        return aggregates;
    };
    
    // --- 5. Return Consolidated Result ---
    return {
        currentWeek: {
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            totalTime: {
                totalMinutes: currentWeekTotalMinutes,
                totalHours: (currentWeekTotalMinutes / 60).toFixed(2),
            },
            dailyAggregates: formatAggregates(weekDailyTotalsMap),
        },
        currentMonth: {
            monthStart: monthStart.toISOString().split('T')[0],
            monthEnd: monthEnd.toISOString().split('T')[0],
            totalTime: {
                totalMinutes: currentMonthTotalMinutes,
                totalHours: (currentMonthTotalMinutes / 60).toFixed(2),
            },
            dailyAggregates: formatAggregates(monthDailyTotalsMap),
        },
    };
}

 export const accesTypeView=(value)=>{
    if (value===100) {
      return "Viewer"
    }
    if (value===200) {
      return "Editor"
    }
    if (value===300) {
      return "Manager"
    }
    if (value===400) {
      return "Admin"
    }
  }



/**
 * Close active sprint & activate next sprint
 * @param {String} projectId
 * @param {String} partnerId
 */
export const closeSprintAndActivateNext = async (
  projectId,
  partnerId
) => {
  const session = await partnerSprint.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find active sprint
    const activeSprint = await partnerSprint.findOne({
      projectId,
      partnerId,
      isActive: true,
    }).session(session);

    if (!activeSprint) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: false,
        message: "No active sprint found",
      };
    }

    // 2️⃣ Close active sprint
    activeSprint.isActive = false;
    await activeSprint.save({ session });

    // 3️⃣ Find next sprint (by sprintNumber)
    const nextSprint = await partnerSprint.findOne({
      projectId,
      partnerId,
      sprintNumber: activeSprint.sprintNumber + 1,
    }).session(session);

    // 4️⃣ Activate next sprint (if exists)
    if (nextSprint) {
      nextSprint.isActive = true;
      await nextSprint.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      closedSprint: activeSprint.sprintName,
      activatedSprint: nextSprint ? nextSprint.sprintName : null,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};



export const getSprintContext = async (projectId) => {
  const current = await partnerSprint.findOne({
    projectId,
    isActive: true,
  });

  if (!current) return null;

  const previous = await partnerSprint.findOne({
    projectId,
    sprintNumber: current.sprintNumber - 1,
  });

  const next = await partnerSprint.findOne({
    projectId,
    sprintNumber: current.sprintNumber + 1,
  });

  return { current, previous, next };
};


/**
 * Derives Todo, Done, InProgress, and Testing status sets from board columns.
 * Assumes 0 is Todo, Last is Done, 1 is InProgress, 2 is Testing.
 * @param {Array} boardColumns 
 */
export const getSprintStatusSets = (boardColumns = []) => {
  const todoStatuses = (boardColumns[0]?.statusKeys || ["TODO", "BACKLOG", "OPEN"]).map(s => s.toUpperCase());
  const doneStatuses = (boardColumns[boardColumns.length - 1]?.statusKeys || ["DONE", "CLOSED"]).map(s => s.toUpperCase());
  
  // Intermediate columns (heuristically determined by position)
  const inProgressStatuses = (boardColumns[1]?.statusKeys || ["IN PROGRESS", "DEVELOPMENT"]).map(s => s.toUpperCase());
  const testingStatuses = (boardColumns[2]?.statusKeys || ["TESTING", "QA", "REVIEW", "IN_REVIEW"]).map(s => s.toUpperCase());

  return {
    todoSet: new Set(todoStatuses),
    doneSet: new Set(doneStatuses),
    progressSet: new Set(inProgressStatuses),
    testingSet: new Set(testingStatuses),
    todoStatuses,
    doneStatuses,
    inProgressStatuses,
    testingStatuses
  };
};


export const getAppSprintAnalytics = async (sprintId) => {
  try {
    if (!sprintId) {
      throw new Error("Sprint ID required");
    }

    // Fetch sprint detail
    const sprint = await partnerSprint.findOne({ id: sprintId }).lean();
    if (!sprint) {
      throw new Error("Sprint not found");
    }

    // Fetch tasks associated with the sprint
    const tasks = await TicketModel.find({ sprint: sprintId }).lean();
    
    // Fetch Scrum Flow (Board Flow) with automatic fallback
    const flow = await getProjectFlowWithFallback(sprint.projectId);
    const boardColumns = flow?.columns || [];

    // Derive status sets from columns
    const { todoSet, doneSet, progressSet, testingSet } = getSprintStatusSets(boardColumns);

    // Effort field fallback (no longer using AnalyticMapping in this simple version)
    const effortField = "storyPoint";

    // Initialize counters
    let totalStoryPoint = 0;
    let completedStoryPoint = 0;
    
    let todoCount = 0;
    let inProgressCount = 0;
    let testingCount = 0;
    let doneCount = 0;

    tasks.forEach((task) => {
      // Use standard effort fields with fallbacks
      const estimate = Number(task[effortField] || task.estimatePoints || 0);
      totalStoryPoint += estimate;
      
      const status = (task?.status || "").toUpperCase();

      if (todoSet.has(status)) {
        todoCount++;
      } else if (doneSet.has(status)) {
        doneCount++;
        completedStoryPoint += estimate;
      } else if (progressSet.has(status)) {
        inProgressCount++;
      } else if (testingSet.has(status)) {
        testingCount++;
      } else {
        // Fallback for any other statuses (count as in progress if not todo or done)
        inProgressCount++;
      }
    });

    const taskStatusOverview = boardColumns.reduce((acc, col) => {
      const normalizedKeys = (col.statusKeys || []).map(k => k.toUpperCase());
      acc[col.name] = tasks.filter(t => normalizedKeys.includes((t.status || "").toUpperCase())).length;
      return acc;
    }, {});

    const totalTaskInSprint = tasks.length;
    const completedTaskInSprint = doneCount;

    const taskCompletionPercent = totalTaskInSprint > 0 ? (completedTaskInSprint / totalTaskInSprint) * 100 : 0;
    const avgStoryPointPerTask = totalTaskInSprint > 0 ? totalStoryPoint / totalTaskInSprint : 0;
    
    // Date calculation
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    const diffTime = endDate - now;
    const daysRemaining = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    const remainingStoryPoint = totalStoryPoint - completedStoryPoint;
    const velocityPercent = totalStoryPoint > 0 ? (completedStoryPoint / totalStoryPoint) * 100 : 0;

    // Prepare result
    const sprintAnalytics = {
      sprintId,
      sprintName: sprint.sprintName,
      totalStoryPoint,
      completedStoryPoint,
      remainingStoryPoint,
      velocityPercent: Number(velocityPercent.toFixed(2)),
      totalTaskInSprint,
      completedTaskInSprint,
      todoCount,
      inProgressCount,
      testingCount,
      doneCount,
      taskStatusOverview,
      taskCompletionPercent: Number(taskCompletionPercent.toFixed(2)),
      avgStoryPointPerTask: Number(avgStoryPointPerTask.toFixed(2)),
      daysRemaining,
    };

    return sprintAnalytics;
  } catch (error) {
    console.error("Error in getAppSprintAnalytics:", error.message);
    throw error;
  }
};

/**
 * Advanced Sprint Analytics using explicit AnalyticMapping for DORA/Insights.
 * Falls back to Board Flow logic if mapping is missing.
 */
export const getAppSprintAnalyticsByMapping = async (sprintId) => {
  try {
    const sprint = await partnerSprint.findOne({ id: sprintId }).lean();
    if (!sprint) throw new Error("Sprint not found");

    const [tasks, flow, mapping] = await Promise.all([
      TicketModel.find({ sprint: sprintId }).lean(),
      getProjectFlowWithFallback(sprint.projectId),
      AnalyticMapping.findOne({ projectId: sprint.projectId }).lean()
    ]);

    const boardColumns = flow?.columns || [];
    
    // 1️⃣ Status Mapping Logic
    let todoSet, doneSet, progressSet, testingSet;
    
    if (mapping?.statusMapping) {
      todoSet = new Set((mapping.statusMapping.todo || []).map(s => s.toUpperCase()));
      doneSet = new Set((mapping.statusMapping.done || []).map(s => s.toUpperCase()));
      progressSet = new Set((mapping.statusMapping.inProgress || []).map(s => s.toUpperCase()));
      testingSet = new Set((mapping.statusMapping.testing || []).map(s => s.toUpperCase()));
    } else {
      // Fallback to flow-based sets if no mapping exists
      const sets = getSprintStatusSets(boardColumns);
      todoSet = sets.todoSet;
      doneSet = sets.doneSet;
      progressSet = sets.progressSet;
      testingSet = sets.testingSet;
    }

    // 2️⃣ Effort Field Logic
    const effortField = mapping?.effortConfig?.field || "storyPoint";

    // 3️⃣ Metrics Calculation
    let totalStoryPoint = 0;
    let completedStoryPoint = 0;
    let todoCount = 0;
    let inProgressCount = 0;
    let testingCount = 0;
    let doneCount = 0;

    tasks.forEach(task => {
      const estimate = Number(task[effortField] || task.estimatePoints || 0);
      totalStoryPoint += estimate;
      
      const status = (task?.status || "").toUpperCase();
      if (doneSet.has(status)) {
        doneCount++;
        completedStoryPoint += estimate;
      } else if (todoSet.has(status)) {
        todoCount++;
      } else if (progressSet.has(status)) {
        inProgressCount++;
      } else if (testingSet.has(status)) {
        testingCount++;
      } else {
        inProgressCount++; // Logical fallback
      }
    });

    // 4️⃣ Board Flow Context (Insights for all status)
    const taskStatusOverview = boardColumns.reduce((acc, col) => {
      const normalizedKeys = (col.statusKeys || []).map(k => k.toUpperCase());
      acc[col.name] = tasks.filter(t => normalizedKeys.includes((t.status || "").toUpperCase())).length;
      return acc;
    }, {});

    const totalTaskInSprint = tasks.length;
    const taskCompletionPercent = totalTaskInSprint > 0 ? (doneCount / totalTaskInSprint) * 100 : 0;
    const velocityPercent = totalStoryPoint > 0 ? (completedStoryPoint / totalStoryPoint) * 100 : 0;

    // Date/Time
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    return {
      sprintId,
      sprintName: sprint.sprintName,
      totalStoryPoint,
      completedStoryPoint,
      remainingStoryPoint: totalStoryPoint - completedStoryPoint,
      velocityPercent: Number(velocityPercent.toFixed(2)),
      totalTaskInSprint,
      completedTaskInSprint: doneCount,
      todoCount,
      inProgressCount,
      testingCount,
      doneCount,
      taskStatusOverview,
      taskCompletionPercent: Number(taskCompletionPercent.toFixed(2)),
      avgStoryPointPerTask: Number((totalTaskInSprint > 0 ? totalStoryPoint / totalTaskInSprint : 0).toFixed(2)),
      daysRemaining,
      // Metadata for AI
      effortField,
      source: mapping ? "ANAL_MAPPING" : "BOARD_FLOW"
    };
  } catch (error) {
    console.error("Error in getAppSprintAnalyticsByMapping:", error.message);
    throw error;
  }
};


export const validateScrumFlow = (columns) => {
  const statusSet = new Set();

  for (const column of columns) {
    if (!column.statusKeys || column.statusKeys.length === 0) {
      throw new Error(`Column "${column.name}" has no statuses`);
    }

    for (const status of column.statusKeys) {
      if (statusSet.has(status)) {
        throw new Error(`Status "${status}" mapped multiple times`);
      }
      statusSet.add(status);
    }
  }

  return true;


  /// use validateScrumFlow(columns);

};


import { v4 as uuidv4 } from "uuid";
import User from "../models/UserModel.js";
import { ProjectModel } from "../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../models/PlatformModel/UserWorkAccessModel.js";

/**
 * Shared default columns
 * Single source of truth
 */
export const DEFAULT_COLUMNS = [
  {
    id: "col_1",
    name: "To Do",
    statusKeys: ["OPEN", "IN_PROGRESS"],
    color: "#3b82f6",
    wipLimit: null,
    order: 1,
  },
  {
    id: "col_2",
    name: "In Progress",
    statusKeys: ["IN_PROGRESS", "IN_REVIEW", "OPEN"],
    color: "#f59e0b",
    wipLimit: 5,
    order: 2,
  },
  {
    id: "col_3",
    name: "In Review",
    statusKeys: ["IN_REVIEW", "IN_PROGRESS", "OPEN"],
    color: "#6366f1",
    wipLimit: null,
    order: 3,
  },
  {
    id: "col_4",
    name: "Done",
    statusKeys: ["CLOSED", "OPEN"],
    color: "#10b981",
    wipLimit: null,
    order: 4,
  },
];

/**
 * Normalize columns for Sprint Board
 */
function mapColumnsForBoard(columns) {
  return columns.map((col) => ({
    columnId: col.id,
    name: col.name,
    statusKeys: col.statusKeys,
    color: col.color,
    wipLimit: col.wipLimit,
    order: col.order,
  }));
}

/**
 * Normalize columns for Flow
 */
function mapColumnsForFlow(columns) {
  return columns.map((col) => ({
    id: col.id,
    name: col.name,
    statusKeys: col.statusKeys,
    color: col.color,
    wipLimit: col.wipLimit,
    order: col.order,
  }));
}

/**
 * Auto-create default Sprint Board + Scrum Flow
 * Safe to call multiple times
 */
export async function autoCreateDefaultBoardAndFlow({
  projectId,
  userId,
  workflowSource = "PROJECT",
}) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  console.log("🚀 Auto creating board & flow for project:", projectId);

  /* -------------------------------------------------
   * 1️⃣ Sprint Board
   * ------------------------------------------------- */
  let board = await SprintBoardConfig.findOne({
    projectId,
    isActive: true,
  });

  if (!board) {
    board = await SprintBoardConfig.create({
      projectId,
      boardName: "Sprint Board",
      columns: mapColumnsForBoard(DEFAULT_COLUMNS),
      workflowSource,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    });

    console.log("✅ Sprint Board created");
  } else {
    console.log("ℹ️ Sprint Board already exists");
  }

  /* -------------------------------------------------
   * 2️⃣ Scrum Project Flow
   * ------------------------------------------------- */
  let flow = await ScrumProjectFlow.findOne({
    projectId,
    isActive: true,
  });

  if (!flow) {
    flow = await ScrumProjectFlow.create({
      id: uuidv4(),
      projectId,
      flowName: "Default Scrum Flow",
      columns: mapColumnsForFlow(DEFAULT_COLUMNS),
      sourceType: workflowSource,
      importedFromFlowId: null,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    });

    console.log("✅ Scrum Project Flow created");
  } else {
    console.log("ℹ️ Scrum Project Flow already exists");
  }

  return { board, flow };
}



// utility function for normalize the flow for dropdown

/**
 * Converts ScrumProjectFlow → Dropdown config
 */
export const buildDropdownConfigFromFlow = (flow) => {
  if (!flow || !Array.isArray(flow.columns)) {
    return {
      ticketTypes: [],
      statusColors: {},
      statusWorkflow: {},
    };
  }

  // 1️⃣ Sort columns by order
  const sortedColumns = [...flow.columns].sort(
    (a, b) => a.order - b.order
  );

  const ticketTypesSet = new Set();
  const statusColors = {};
  const statusWorkflow = {};

  // Map each status to the index of its FIRST column occurrence.
  // If a status appears in multiple columns this is ambiguous and likely a data issue;
  // we'll prefer the first occurrence but log a warning so the data can be corrected.
  const statusToColIndex = {};
  const duplicates = [];

  // 2️⃣ Collect all statuses + colors and build first-occurrence index
  sortedColumns.forEach((column, colIndex) => {
    (column.statusKeys || []).forEach((status) => {
      ticketTypesSet.add(status);

      if (statusToColIndex[status] === undefined) {
        statusToColIndex[status] = colIndex;
      } else if (!duplicates.includes(status)) {
        duplicates.push(status);
      }

      if (!statusColors[status]) {
        statusColors[status] = {
          bg: `${column.color}22`, // soft background
          text: column.color,
          border: column.color,
        };
      }
    });
  });

  if (duplicates.length > 0) {
    console.warn(
      "buildDropdownConfigFromFlow: duplicate status mapping found (status appears in multiple columns).\nPlease ensure each status is mapped to exactly one column for predictable workflow transitions.",
      duplicates
    );
  }

  // Precompute column -> statuses array for quick lookup
  const columnsStatuses = sortedColumns.map((c) => c.statusKeys || []);

  // 3️⃣ Build workflow transitions using the first column where a status appears
  for (const status of ticketTypesSet) {
    const colIndex = statusToColIndex[status];
    const sameColumnStatuses = columnsStatuses[colIndex] || [];
    const nextColumnStatuses = columnsStatuses[colIndex + 1] || [];

    statusWorkflow[status] = Array.from(
      new Set([...sameColumnStatuses, ...nextColumnStatuses])
    ).filter((s) => s !== status);
  }

  return {
    ticketFlowTypes: Array.from(ticketTypesSet),
    statusColors,
    statusWorkflow,
  };
};


export const normalizeSprintView = ({ board, flow }) => {
  /**
   * Priority:
   * 1. Project Board
   * 2. Project Flow
   * 3. Template Board
   * 4. Template Flow
   */

  if (board) {
    return {
      source: "BOARD",
      id: board.id,
      name: board.boardName,
      columns: board.columns,
      statusWorkflow: board.statusWorkflow,
      statusColors: board.statusColors,
      ticketFlowTypes: board.ticketFlowTypes,
      editable: true,
    };
  }

  if (flow) {
    const columns = flow.ticketFlowTypes.map((status, index) => ({
      columnId: `flow_col_${index + 1}`,
      name: status.replaceAll("_", " "),
      statusKeys: [status],
      color: flow.statusColors?.[status]?.text || "#64748b",
      wipLimit: null,
      order: index + 1,
    }));

    return {
      source: "FLOW",
      id: flow.flowId,
      name: flow.flowName,
      columns,
      statusWorkflow: flow.statusWorkflow,
      statusColors: flow.statusColors,
      ticketFlowTypes: flow.ticketFlowTypes,
      editable: true,
    };
  }

  return null;
};


export const getUserDetailById=async(id)=>{
  try {
    if (!id) {
    // throw new error;
    console.log("No ID provided");
    }
    let userDetails = await User.findById(id);
    return {
        name: `${userDetails?.profile?.firstName ?? ''} ${userDetails?.profile?.lastName ?? ''}`.trim(),
        email:userDetails.email,
        image:userDetails.profile?.avatar
    }
  } catch (error) {
    // throw new error;// foir updated db uri
    return {
        name: "",
        email:""
    }
  }
}


// 1. Helper function to extract, flatten, and unique-ify by ID 
export const getCleanUniqueItems = (configArray, key, fields) => {
  // Flatten the nested arrays from all projects
  const allItems = configArray.flatMap(item => item[key] || []);
  
  // Use a Map to ensure uniqueness by 'id'
  const uniqueMap = new Map(allItems.map(item => [item.id, item]));
  
  // Convert back to array and "Pick" only the specific fields requested
  return Array.from(uniqueMap.values()).map(item => {
    const picked = {};
    fields.forEach(field => picked[field] = item[field]);
    return picked;
  });
};

export function extractJSONForLLM(result) {
  try {
    // 1. Get the raw text from the SDK object
    let rawText = result.response.text(); 
    
    // 2. Clean common LLM formatting if not using responseMimeType
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    
    // 3. Parse into a real JS Object
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Failed to parse AI response as JSON", err);
    return null;
  }
}


export const getProjectFlowWithFallback = async (projectId) => {
  let flow = await ScrumProjectFlow.findOne({ projectId, isActive: true }).lean();
  if (!flow) {
    flow = await ScrumProjectFlow.findOne({ projectId: "DEFAULT", isActive: true }).lean();
  }
  // Ultimate safety fallback to code constants if DB is empty
  if (!flow) {
    return { columns: DEFAULT_COLUMNS.map(col => ({ ...col, statusKeys: col.statusKeys || [] })) };
  }
  return flow;
};

export const getFullprojectCurrentWorkdetails = async (projectId, userId) => {
  try {
    const flow = await getProjectFlowWithFallback(projectId);

    const boardColumns = flow?.columns || [];

    const [tickets, teamMembers] = await Promise.all([
      TicketModel.find({ projectId, assignee: userId }).lean(),
      UserWorkAccess.find({ projectId, userId: { $ne: null } }).lean().select("userId")
    ]);

    const taskStatusOverview = boardColumns.reduce((acc, column) => {
      const count = tickets.filter(t => column.statusKeys.includes(t.status)).length;
      acc[column.name] = count;
      return acc;
    }, {});

    const teamMemberDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const team = await getUserDetailById(member.userId);
        return {
          image: team?.image,
          name: team?.name,
        };
      })
    );

    return {
      workCountForProject: tickets.length,
      taskStatusOverview,
      teamMemberDetails
    };
  } catch (error) {
    console.error("Error in getFullprojectCurrentWorkdetails:", error);
    return {
      workCountForProject: 0,
      todoCount: 0,
      inProgressCount: 0,
      testingCount: 0,
      doneCount: 0,
      teamMemberDetails: []
    };
  }
};