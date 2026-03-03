import ProjectService from "../../models/PlatformModel/ProjectServiceSchema.js";
import HoraService from "../../models/HoraInternal/HoraServiceSchema.js";

/**
 * Get all services for a specific project
 * GET /api/hora/v1/projects/:projectId/services
 */
export const getProjectServices = async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectServices = await ProjectService.find({ projectId })
      .populate("serviceId")
      .lean();

    return res.status(200).json({
      success: true,
      data: projectServices
    });
  } catch (error) {
    console.error("getProjectServices Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch project services" });
  }
};

/**
 * Subscribe a project to a service
 * POST /api/hora/v1/projects/:projectId/services
 */
export const subscribeProjectToService = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { serviceId, planType } = req.body;

    if (!serviceId) {
      return res.status(400).json({ success: false, message: "Service ID is required" });
    }

    // Check if already subscribed
    const existing = await ProjectService.findOne({ projectId, serviceId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Project already subscribed to this service" });
    }

    const subscription = await ProjectService.create({
      projectId,
      serviceId,
      planType: planType || "FREE",
      createdBy: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed to service successfully",
      data: subscription
    });
  } catch (error) {
    console.error("subscribeProjectToService Error:", error);
    return res.status(500).json({ success: false, message: "Failed to subscribe" });
  }
};

/**
 * Update project service subscription
 * PUT /api/hora/v1/projects/:projectId/services/:serviceId
 */
export const updateProjectSubscription = async (req, res) => {
  try {
    const { projectId, serviceId } = req.params;
    const { planType, isActive } = req.body;

    const updated = await ProjectService.findOneAndUpdate(
      { projectId, serviceId },
      { $set: { planType, isActive } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription updated",
      data: updated
    });
  } catch (error) {
    console.error("updateProjectSubscription Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update subscription" });
  }
};

/**
 * Unsubscribe or delete project service
 * DELETE /api/hora/v1/projects/:projectId/services/:serviceId
 */
export const unsubscribeProjectFromService = async (req, res) => {
  try {
    const { projectId, serviceId } = req.params;

    const deleted = await ProjectService.findOneAndDelete({ projectId, serviceId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Unsubscribed successfully"
    });
  } catch (error) {
    console.error("unsubscribeProjectFromService Error:", error);
    return res.status(500).json({ success: false, message: "Failed to unsubscribe" });
  }
};
