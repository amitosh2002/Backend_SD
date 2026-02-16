import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../../models/PlatformModel/SprintModels/partnerSprint.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import { getAppSprintAnalytics, getProjectFlowWithFallback, getSprintStatusSets, getUserDetailById } from "../../utility/platformUtility.js";
import AnalyticMapping from "../../models/AnalyticsModels/AnalyticsMappingFields.js";
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { getSprintReport, getSprintVelocityMatrix } from "../../utility/doraUtility.js";

export const getSprintBurndown = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await partnerSprint.findOne({ id: sprintId });
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    const tasks = await TicketModel.find({ sprint: sprintId });
    const flow = await getProjectFlowWithFallback(sprint.projectId);
    const boardColumns = flow?.columns || [];

    const { doneSet } = getSprintStatusSets(boardColumns);
    const effortField = "storyPoint";

    const totalPoints = tasks.reduce(
      (sum, t) => sum + (t[effortField] || t.estimatePoints || 0),
      0
    );

    const completedPoints = tasks
      .filter((t) => doneSet.has(t.status?.toUpperCase()))
      .reduce((sum, t) => sum + (t[effortField] || t.estimatePoints || 0), 0);

    const remainingPoints = totalPoints - completedPoints;

    return res.status(200).json({
      success: true,
      sprint: sprint.sprintName,
      totalPoints,
      completedPoints,
      remainingPoints,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};



export const getSprintTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;

    const sprints = await partnerSprint.find({ projectId }).sort({
      sprintNumber: 1,
    });

    const timeline = sprints.map((sprint) => ({
      sprintName: sprint.sprintName,
      sprintNumber: sprint.sprintNumber,
      status: sprint.isActive
        ? "ACTIVE"
        : new Date(sprint.endDate) < new Date()
        ? "COMPLETED"
        : "UPCOMING",
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    }));

    return res.status(200).json({ success: true, timeline });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


// sprint velocity over last N sprints
export const getSprintVelocity = async (req, res) => {
  try {
    const { projectId } = req.params;

    const completedSprints = await partnerSprint.find({
      projectId,
      isActive: false,
    });

    const velocityData = [];
    const flow = await getProjectFlowWithFallback(projectId);
    const boardColumns = flow?.columns || [];

    const { doneSet } = getSprintStatusSets(boardColumns);
    const effortField = "storyPoint";

    for (const sprint of completedSprints) {
      const tasks = await TicketModel.find({
        sprint: sprint.id,
        status: { $in: Array.from(doneSet) },
      });

      const points = tasks.reduce(
        (sum, t) => sum + (t[effortField] || t.estimatePoints || 0),
        0
      );

      velocityData.push({
        sprintName: sprint.sprintName,
        sprintNumber: sprint.sprintNumber,
        completedPoints: points,
      });
    }

    const averageVelocity =
      velocityData.reduce((sum, s) => sum + s.completedPoints, 0) /
      (velocityData.length || 1);

    return res.status(200).json({
      success: true,
      averageVelocity: Math.round(averageVelocity),
      velocityData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

//  export const platVelocityMatrix = async (req, res) => {
//   try {
//     const userId = req.user?.userId;
//     console.log("platVelocityMatrix hit");

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID missing",
//       });
//     }

//     // 1️⃣ Get projects user has access to
//     const allProjects = await UserWorkAccess
//       .find({ userId, accessType: { $gt: 200 } })
//       .select("projectId")
//       .lean();

//     const projectIds = [...new Set(allProjects.map(p => p.projectId))];

//     if (!projectIds.length) {
//       return res.json({
//         success: true,
//         data: [],
//         message: "No projects found",
//       });
//     }

//     // 2️⃣ Group tickets by project
//     const ticketsByProject = await TicketModel.aggregate([
//       {
//         $match: {
//           projectId: { $in: projectIds },
//         },
//       },
//       {
//         $group: {
//           _id: "$projectId",
//           tickets: { $push: "$$ROOT" },
//         },
//       },
//     ]);
//     console.log(ticketsByProject)

//     // const ticketWiseAnalytics = ticketsByProject.map( project => ({
//     //   projectId: project._id,
//     //   ticketSprint:project.ticket.sprint
//     //     // tickets: await getAppSprintAnalytics(project.tickets.sprint),
//     //   }));

//     // console.log(ticketWiseAnalytics,"sprint")
  
// const sprintReport = []







//     const projectSprint = await partnerSprint.find({projectId:{$in:projectIds}}).sort({startDate:-1}).lean();
//     // console.log(projectSprintVelocity,"psv")
  
//     // const velocityMatrix = projectSprintVelocity.map( project => ({
//     //   projectId: project.projectId,
//     //   sprints: getAppSprintAnalytics(project.sprint),
//     // }));



//     for (const project of projectSprint) {
//       console.log(project)
//       const sprintAnalytics = await getAppSprintAnalytics(project.id);
//       sprintReport.push({
//         projectId: project._id,
//         sprintAnalytics,
//       });
//     }
//     // console.log(velocityMatrix,"vm")
//     console.log(sprintReport,"report")


//     const usersWorkingForProject = await UserWorkAccess.find({projectId:{$in:projectIds},userId:{$ne:null}}).select("userId").lean();
//    // 1. Extract the IDs into a flat array
//     // const userIdsArray = usersWorkingForProject.map(item => item.userId);
//     // console.log(userIdsArray)
// // Convert all ObjectIds to Strings to ensure matching
// const userIdsArray = usersWorkingForProject.map(item => String(item.userId));

// const userTickets = await TicketModel.aggregate([
//   {
//     $match: {
//       projectId: { $in: projectIds },
//       // Use the string version
//       assignee: { $in: userIdsArray }, 
//     },
//   },
//   {
//     $group: {
//       _id: "$projectId",
//       userId: { $first: "$assignee" },
//       tickets: { $push: "$$ROOT" },
//     },
//   },
// ]);
//     console.log(userTickets,"userTickets");

//     // userProjects is an array of objects like the one you shared
// const everyUserTicket = userTickets.flatMap(project => 
//   project.tickets.map(ticket => ({
//     projectId: project._id,
//     userId: project.userId,
//     ticketId: ticket._id,
//     ticketData: ticket
//   }))
// );
// console.log(everyUserTicket,"every ticket for usef");

// // 3️⃣ Get mappings for all projects
// const allMappings = await AnalyticMapping.find({ projectId: { $in: projectIds } }).lean();
// const projectDoneMap = allMappings.reduce((acc, m) => {
//   acc[m.projectId] = (m.statusMapping?.done || []).map(s => s.toUpperCase());
//   return acc;
// }, {});

// const velocityStats = everyUserTicket.reduce((acc, item) => {
//   const { userId, ticketData, projectId } = item;
//   const doneStatuses = projectDoneMap[projectId] || ["CLOSED", "DONE"];
  
//   if (!acc[userId]) {
//     acc[userId] = { totalCompleted: 0, totalMinutes: 0, ticketKeys: [] };
//   }

//   const currentStatus = ticketData.status?.toUpperCase();

//   if (doneStatuses.includes(currentStatus)) {
//     acc[userId].totalCompleted += 1;
//     acc[userId].totalMinutes += (ticketData.totalTimeLogged || 0);
//     acc[userId].ticketKeys.push(ticketData.ticketKey);
//   }

//   return acc;
// }, {});

// console.log("Final Velocity Matrix:", velocityStats);




//     // Run this in your backend controller


//     // const UserVelocityMatrix= userTickets.map(projectIds=>{
//     //   projectIds.tiuckets.map(ticket=>ticket._id)
//     // })

//         console.log(userVelocityMatrix,"userTickets");

//     // const userAssignedTickets = await TicketModel.find({
//     //   projectId:{$in:userForProject.projectIds},

//     // })
    

//     // 3️⃣ Sprint analytics per project
//     // const velocityMatrix = ticketsByProject.map(project => ({
//     //   projectId: project.projectId,
//     //   sprints: getAppSprintAnalytics(project.tickets.sprint),
//     // }));

//     // ✅ ALWAYS RETURN RESPONSE
//     return res.json({
//       success: true,
//       data: velocityMatrix,
//     });

//   } catch (error) {
//     console.error("platVelocityMatrix error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };
export const platSprintAnalytics = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { projectId } = req.body; 

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "User ID or Project ID missing",
      });
    }

    // 1️⃣ Check user access to this project
    const hasAccess = await UserWorkAccess.findOne({
      userId,
      projectId,
      accessType: { $gt: 200 }
    }).lean();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "No access to this project",
      });
    }

    // 2️⃣ Get the 3 most recent sprints (Active + Previous)
    // We sort by sprintNumber descending to get the latest ones
    const recentSprints = await partnerSprint.find({ projectId })
      .sort({ sprintNumber: -1 })
      .limit(3)
      .lean();

    if (!recentSprints.length) {
      return res.json({ success: true, data: [] });
    }

    const sprintIds = recentSprints.map(s => s.id);
    const sprintMap = recentSprints.reduce((acc, s) => {
        acc[s.id] = s.sprintName;
        return acc;
    }, {});
    console.log(sprintIds,"sprintIds");
    console.log(sprintMap,"sprintMap");
    // 3️⃣ Identify users working in this project
    const usersWorking = await UserWorkAccess.find({
      projectId,
      userId: { $ne: null }
    }).select("userId").lean();

    const userIds = [...new Set(usersWorking.map(u => String(u.userId)))];
    console.log(userIds,"userIds");

    // 4️⃣ Project-specific status mapping from Board Flow with automatic fallback
    const flow = await getProjectFlowWithFallback(projectId);
    const boardColumns = flow?.columns || [];
    
    // Categorize status sets from flow columns dynamically using shared utility
    const { todoSet, doneSet, progressSet, testingSet } = getSprintStatusSets(boardColumns);
    // 5️⃣ Fetch all tickets for these sprints & users
    const tickets = await TicketModel.find({
      projectId,
      sprint: { $in: sprintIds },
      assignee: { $in: userIds }
    }).lean();
    // 6️⃣ Build User Velocity Matrix
    // const velocityMatrix = {};
     const velocityMatrix=await getSprintVelocityMatrix(tickets, { doneSet, todoSet, progressSet, testingSet }, sprintMap,projectId)
   
    // 7️⃣ Calculate Top Contributor (User with most completed points)
    let topContributorId = null;
    let maxScore = -1;

    Object.values(velocityMatrix).forEach(user => {
        if (user.totalCompleted > maxScore) {
            maxScore = user.totalCompleted;
            topContributorId = user.userId;
        }
    });

    // 8️⃣ Finalize response data
    const result = Object.values(velocityMatrix).map(user => ({
        ...user,
        isTopContributor: user.userId === topContributorId
    }));

   
    // 9️⃣ Generate AI Analytics for these sprints (Graceful failure)
    let reportAnalysis = null;
    try {
      reportAnalysis = await getSprintReport(sprintIds);
    } catch (aiError) {
      console.warn("AI Analytics skip/fail:", aiError.message);
      reportAnalysis = {
        summary: { title: "Analytics Summary (AI Offline)" },
        insights: ["AI analysis is currently unavailable due to quota limits, but your metrics are shown below."],
        recommendations: ["Check back later for AI-powered sprint insights."]
      };
    }

    return res.json({
      success: true,
      data: result,
      analytics: reportAnalysis
    });

  } catch (error) {
    console.error("platVelocityMatrix error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
