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