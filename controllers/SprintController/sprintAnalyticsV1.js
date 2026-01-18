import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../../models/PlatformModel/SprintModels/partnerSprint.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import { getAppSprintAnalytics } from "../../utility/platformUtility.js";

export const getSprintBurndown = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await PartnerSprint.findOne({ id: sprintId });
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    const tasks = await Task.find({ sprintId });

    const totalPoints = tasks.reduce(
      (sum, t) => sum + (t.estimatePoints || 0),
      0
    );

    const completedPoints = tasks
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.estimatePoints, 0);

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

    for (const sprint of completedSprints) {
      const tasks = await Task.find({
        sprintId: sprint.id,
        status: "DONE",
      });

      const points = tasks.reduce(
        (sum, t) => sum + (t.estimatePoints || 0),
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

 export const platVelocityMatrix = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log("platVelocityMatrix hit");

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    // 1️⃣ Get projects user has access to
    const allProjects = await UserWorkAccess
      .find({ userId, accessType: { $gt: 200 } })
      .select("projectId")
      .lean();

    const projectIds = [...new Set(allProjects.map(p => p.projectId))];

    if (!projectIds.length) {
      return res.json({
        success: true,
        data: [],
        message: "No projects found",
      });
    }

    // 2️⃣ Group tickets by project
    const ticketsByProject = await TicketModel.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: "$projectId",
          tickets: { $push: "$$ROOT" },
        },
      },
    ]);
    console.log(ticketsByProject)

    // const ticketWiseAnalytics = ticketsByProject.map( project => ({
    //   projectId: project._id,
    //   ticketSprint:project.ticket.sprint
    //     // tickets: await getAppSprintAnalytics(project.tickets.sprint),
    //   }));

    // console.log(ticketWiseAnalytics,"sprint")
  
const sprintReport = []







    const projectSprint = await partnerSprint.find({projectId:{$in:projectIds}}).sort({startDate:-1}).lean();
    // console.log(projectSprintVelocity,"psv")
  
    // const velocityMatrix = projectSprintVelocity.map( project => ({
    //   projectId: project.projectId,
    //   sprints: getAppSprintAnalytics(project.sprint),
    // }));



    for (const project of projectSprint) {
      console.log(project)
      const sprintAnalytics = await getAppSprintAnalytics(project.id);
      sprintReport.push({
        projectId: project._id,
        sprintAnalytics,
      });
    }
    // console.log(velocityMatrix,"vm")
    console.log(sprintReport,"report")


    const usersWorkingForProject = await UserWorkAccess.find({projectId:{$in:projectIds},userId:{$ne:null}}).select("userId").lean();
   // 1. Extract the IDs into a flat array
    // const userIdsArray = usersWorkingForProject.map(item => item.userId);
    // console.log(userIdsArray)
// Convert all ObjectIds to Strings to ensure matching
const userIdsArray = usersWorkingForProject.map(item => String(item.userId));

const userTickets = await TicketModel.aggregate([
  {
    $match: {
      projectId: { $in: projectIds },
      // Use the string version
      assignee: { $in: userIdsArray }, 
    },
  },
  {
    $group: {
      _id: "$projectId",
      userId: { $first: "$assignee" },
      tickets: { $push: "$$ROOT" },
    },
  },
]);
    console.log(userTickets,"userTickets")

    // const userAssignedTickets = await TicketModel.find({
    //   projectId:{$in:userForProject.projectIds},

    // })
    

    // 3️⃣ Sprint analytics per project
    // const velocityMatrix = ticketsByProject.map(project => ({
    //   projectId: project.projectId,
    //   sprints: getAppSprintAnalytics(project.tickets.sprint),
    // }));

    // ✅ ALWAYS RETURN RESPONSE
    return res.json({
      success: true,
      data: velocityMatrix,
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
