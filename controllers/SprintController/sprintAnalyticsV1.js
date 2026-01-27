import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../../models/PlatformModel/SprintModels/partnerSprint.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import { getAppSprintAnalytics } from "../../utility/platformUtility.js";
import AnalyticMapping from "../../models/AnalyticsModels/AnalyticsMappingFields.js";
import { getSprintReport } from "../../utility/doraUtility.js";

export const getSprintBurndown = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await PartnerSprint.findOne({ id: sprintId });
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    const tasks = await TicketModel.find({ sprint: sprintId });

    const mapping = await AnalyticMapping.findOne({ projectId: sprint.projectId }).lean();
    const effortField = mapping?.effortConfig?.field || "storyPoint";
    const doneStatuses = mapping?.statusMapping?.done || ["CLOSED", "DONE"];

    const totalPoints = tasks.reduce(
      (sum, t) => sum + (t[effortField] || t.storyPoint || t.estimatePoints || 0),
      0
    );

    const completedPoints = tasks
      .filter((t) => doneStatuses.includes(t.status?.toUpperCase()))
      .reduce((sum, t) => sum + (t[effortField] || t.storyPoint || t.estimatePoints || 0), 0);

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

    const sprints = await PartnerSprint.find({ projectId }).sort({
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

    const completedSprints = await PartnerSprint.find({
      projectId,
      isActive: false,
    });

    const velocityData = [];

    const mapping = await AnalyticMapping.findOne({ projectId }).lean();
    const doneStatuses = mapping?.statusMapping?.done || ["CLOSED", "DONE"];
    const effortField = mapping?.effortConfig?.field || "storyPoint";

    for (const sprint of completedSprints) {
      const tasks = await TicketModel.find({
        sprint: sprint.id,
        status: { $in: doneStatuses },
      });

      const points = tasks.reduce(
        (sum, t) => sum + (t[effortField] || t.storyPoint || t.estimatePoints || 0),
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
export const platVelocityMatrix = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { projectId } = req.body; // or req.query.projectId

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

    // 2️⃣ Users working in this project
    const usersWorking = await UserWorkAccess.find({
      projectId,
      userId: { $ne: null }
    }).select("userId").lean();

    const userIds = [...new Set(usersWorking.map(u => String(u.userId)))];

    if (!userIds.length) {
      return res.json({ success: true, data: [] });
    }

    // 3️⃣ Project-specific DONE status mapping
    const mapping = await AnalyticMapping.findOne({ projectId }).lean();

    const doneStatuses =
      (mapping?.statusMapping?.done || ["DONE", "CLOSED"])
        .map(s => s.toUpperCase());

    // 4️⃣ Fetch all tickets for this project & users
    const tickets = await TicketModel.find({
      projectId,
      assignee: { $in: userIds }
    }).lean();

    // 5️⃣ Velocity calculation
    const velocityMatrix = {};

    for (const ticket of tickets) {
      const assignee = String(ticket.assignee);

      if (!velocityMatrix[assignee]) {
        velocityMatrix[assignee] = {
          userId: assignee,
          totalCompleted: 0,
          totalMinutes: 0,
          ticketKeys: []
        };
      }

      if (doneStatuses.includes(ticket.status?.toUpperCase())) {
        velocityMatrix[assignee].totalCompleted += 1;
        velocityMatrix[assignee].totalMinutes += ticket.totalTimeLogged || 0;
        velocityMatrix[assignee].ticketKeys.push(ticket.ticketKey);
      }
    }

    // 6️⃣ Convert to array
    const result = Object.values(velocityMatrix);
   

    const sprintAnalytics = await partnerSprint.find({
      projectId:projectId
    }).select("id").limit(3);

    console.log(sprintAnalytics,"sprintAnalytics")
    let sprints=sprintAnalytics.map(s=>s.id)
    console.log(sprints,"sprints")

    const res= await getSprintReport(sprints);
    console.log("first sprint res",res)



    return res.json({
      success: true,
      data: result
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
