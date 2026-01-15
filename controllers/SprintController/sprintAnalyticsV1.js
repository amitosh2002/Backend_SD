import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";

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

 

export const platVelocityMatrix = async(req,res)=>{
    const userId=req.user.userId;
    console.log("first")

try {

  // if (!userId )return res.status(400).json({success:false,message:"User ID missing"});

  // const allProjects =await UserWorkAccess.find({userId:userId ,accessType:{$gt:200}}).select("projectId").lean();
  // const allUserInProjects= await UserWorkAccess.find({projectId:{$in:allProjects.map(p=>p.projectId)},accessType:{$gt:200}}).select("userId ").lean();
  

  // const Users = [...new Set(allUserInProjects.map(u=>u.userId))];
  // const Projects=[...new Set(allProjects.map(p=>p.projectId))];

  // const allTicket = await Task.find({projectId:{$in:Projects}}).lean();
  // // const sprintAnalytics = 
  // for (const allTickets of allTicket) {
  //   // compute velocity matrix

  //   const
  // }

  


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

const projectIds = [...new Set(allProjects.map(p => String(p.projectId)))];

// 2️⃣ Get tickets for those projects
const allTickets = await TicketModel
  .find({ projectId: { $in: projectIds } })
  .lean();
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








  

} catch (error) {
  

}



}
