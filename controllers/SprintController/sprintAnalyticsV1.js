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
