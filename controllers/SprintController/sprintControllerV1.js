// import PartnerSprint from "../models/partnerSprint.model.js";

import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import partnerSprint from "../../models/PlatformModel/SprintModels/partnerSprint.js";

// CREATE SPRINT
export const createSprint = async (req, res) => {
  try {
    const {  projectId, startDate, endDate,sprintName } = req.body;
    console.log("a[i hit")

    const projectDetails = await ProjectModel.findOne(
      {projectId}
    )

    console.log(projectDetails)
    const sprint = await partnerSprint.create({
      partnerId:projectDetails?.partnerId,
      projectId,
      startDate,
      endDate,
      sprintName
    });
    console.log(sprint)
    return res.status(201).json({
      success: true,
      message: "Sprint created successfully",
      sprint,
    });
  } catch (error) {
    console.error("Error creating sprint:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// LIST ALL SPRINTS FOR PARTNER
export const getSprintsForPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const sprints = await PartnerSprint.find({ partnerId }).sort({
      sprintNumber: 1,
    });

    return res.status(200).json({ success: true, sprints });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE SPRINT
export const updateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await PartnerSprint.findOneAndUpdate(
      { id: sprintId },
      req.body,
      { new: true }
    );

    if (!sprint)
      return res.status(404).json({ success: false, message: "Sprint not found" });

    return res.status(200).json({ success: true, sprint });
  } catch (error) {
    console.error("Error updating sprint:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DEACTIVATE A SPRINT
export const deactivateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await PartnerSprint.findOneAndUpdate(
      { id: sprintId },
      { isActive: false },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Sprint deactivated",
      sprint,
    });
  } catch (error) {
    console.error("Error deactivating sprint:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
