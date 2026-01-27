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


export const getAppSprintAnalytics = async (sprintId) => {
  try {
    if (!sprintId) {
      throw new Error("Sprint ID required");
    }

    // Fetch sprint detail
    const sprint = await partnerSprint.findOne({id:sprintId}).lean();
    if (!sprint) {
      throw new Error("Sprint not found");
    }

    // Fetch tasks associated with the sprint's project
    const tasks = await TicketModel.find({ projectId: sprint.projectId }).lean();
    if (!tasks || tasks.length === 0) {
      throw new Error("No associated work found for the sprint");
    }

    // Fetch mapping
    const mapping = await AnalyticMapping.findOne({ projectId: sprint.projectId }).lean();
    
    // Default mappings if none found
    const todoStatuses = mapping?.statusMapping?.todo || ["OPEN"];
    const inProgressStatuses = mapping?.statusMapping?.inProgress || ["IN_PROGRESS"];
    const testingStatuses = mapping?.statusMapping?.testing || ["TESTING"];
    const doneStatuses = mapping?.statusMapping?.done || ["CLOSED", "DONE"];
    const effortField = mapping?.effortConfig?.field || "storyPoint";

    // Initialize counters
    let totalStoryPoint = 0;
    let completedStoryPoint = 0;
    let totalTaskInSprint = tasks.length;
    let completedTaskInSprint = 0;
    let totalOpenTaskInSprint = 0;
    let totalInProgressTaskInSprint = 0;
    let resolvedTaskInSprint = 0;
    let totalClosedTaskInSprint = 0;
    let totalTicketInTestingInSprint = 0;

    tasks.forEach((task) => {
      const estimate = task[effortField] || task.storyPoint || task.estimatePoints || 0;
      totalStoryPoint += estimate;
      const status = task?.status?.toUpperCase();

      if (todoStatuses.includes(status)) {
        totalOpenTaskInSprint += 1;
      } else if (inProgressStatuses.includes(status)) {
        totalInProgressTaskInSprint += 1;
      } else if (testingStatuses.includes(status)) {
        totalTicketInTestingInSprint += 1;
      } else if (doneStatuses.includes(status)) {
        totalClosedTaskInSprint += 1;
        completedStoryPoint += estimate;
        completedTaskInSprint += 1;
      }

      // Keep resolved counter for backward compatibility if possible, or omit if covered above
      if (status === "RESOLVED") {
        resolvedTaskInSprint += 1;
      }
    });

    const taskCompletionPercent = totalTaskInSprint > 0 ? (completedTaskInSprint / totalTaskInSprint) * 100 : 0;
const avgStoryPointPerTask = totalTaskInSprint > 0 ? totalStoryPoint / totalTaskInSprint : 0;
const daysRemaining = Math.ceil((sprint.endDate - new Date()) / (1000 * 60 * 60 * 24));


    const remainingStoryPoint = totalStoryPoint - completedStoryPoint;
    const velocityPercent = totalStoryPoint > 0 ? (completedStoryPoint / totalStoryPoint) * 100 : 0;
    // Prepare result
    const sprintAnalytics = {
      sprintId,
      totalStoryPoint,
      velocityPercent: velocityPercent.toFixed(2),
      completedStoryPoint,
      remainingStoryPoint,
      totalTaskInSprint,
      completedTaskInSprint,
      totalOpenTaskInSprint,
      totalInProgressTaskInSprint,
      resolvedTaskInSprint,
      totalClosedTaskInSprint,
      totalTicketInTestingInSprint,
      taskCompletionPercent: taskCompletionPercent.toFixed(2),
      avgStoryPointPerTask: avgStoryPointPerTask.toFixed(2),
      daysRemaining,
    };

    return sprintAnalytics;
  } catch (error) {
    console.error("Error in getAppSprintAnalytics:", error.message);
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

/**
 * Shared default columns
 * Single source of truth
 */
const DEFAULT_COLUMNS = [
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
        email:userDetails.email
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