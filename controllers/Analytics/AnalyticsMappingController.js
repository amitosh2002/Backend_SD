import AnalyticMapping from "../../models/AnalyticsModels/AnalyticsMappingFields.js";

/**
 * Get analytics mapping for a project
 */
export const getAnalyticsMapping = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    let mapping = await AnalyticMapping.findOne({ projectId });

    if (!mapping) {
      // Return default configuration if not found
      return res.status(200).json({
        success: true,
        data: {
          projectId,
          effortConfig: { field: 'estimatePoints', unit: 'points' },
          statusMapping: {
            todo: ['OPEN', 'BACKLOG', 'TODO'],
            inProgress: ['IN_PROGRESS', 'CODING', 'PROGRESS'],
            testing: ['TESTING', 'QA', 'UAT'],
            done: ['DONE', 'CLOSED', 'RESOLVED']
          },
          doraConfig: {
            leadTime: {
              startStatus: 'OPEN',
              endStatus: 'DONE',
              startDateField: 'createdAt',
              endDateField: 'deployedAt'
            }
          }
        },
        isDefault: true
      });
    }

    return res.status(200).json({
      success: true,
      data: mapping,
      isDefault: false
    });
  } catch (error) {
    console.error("Error in getAnalyticsMapping:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Save or update analytics mapping for a project
 */
export const saveAnalyticsMapping = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { effortConfig, statusMapping, doraConfig } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const updateData = {
      projectId,
      effortConfig,
      statusMapping,
      doraConfig,
      lastUpdatedBy: req.user?.userId
    };

    const mapping = await AnalyticMapping.findOneAndUpdate(
      { projectId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Analytics mapping saved successfully",
      data: mapping
    });
  } catch (error) {
    console.error("Error in saveAnalyticsMapping:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
