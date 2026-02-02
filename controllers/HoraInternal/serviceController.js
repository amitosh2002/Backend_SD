import HoraService from "../../models/HoraInternal/HoraServiceSchema.js";

/**
 * Get all available Hora services
 * GET /api/hora/services
 */
export const getAllServices = async (req, res) => {
  try {
    const services = await HoraService.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error("getAllServices Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching services"
    });
  }
};

/**
 * Get a single service by ID or Key
 * GET /api/hora/services/:identifier
 */
export const getService = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Search by serviceId or key
    const service = await HoraService.findOne({
      $or: [
        { serviceId: identifier },
        { key: identifier.toUpperCase() }
      ]
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error("getService Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching service details" });
  }
};

/**
 * Create a new service definition
 * POST /api/hora/services
 */
export const createService = async (req, res) => {
  try {
    const { key, name, description, isActive, planType } = req.body;

    if (!key || !name) {
      return res.status(400).json({ success: false, message: "Key and Name are required" });
    }

    const newService = await HoraService.create({
      key: key.toUpperCase().replace(/\s+/g, '_'),
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      planType: planType || "FREE"
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: newService
    });
  } catch (error) {
    console.error("createService Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Service key already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to create service" });
  }
};

/**
 * Update a service definition
 * PUT /api/hora/services/:serviceId
 */
export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updateData = req.body;

    if (updateData.key) {
      updateData.key = updateData.key.toUpperCase().replace(/\s+/g, '_');
    }

    const updatedService = await HoraService.findOneAndUpdate(
      { serviceId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService
    });
  } catch (error) {
    console.error("updateService Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update service" });
  }
};

/**
 * Delete a service definition
 * DELETE /api/hora/services/:serviceId
 */
export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const deletedService = await HoraService.findOneAndDelete({ serviceId });

    if (!deletedService) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully"
    });
  } catch (error) {
    console.error("deleteService Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete service" });
  }
};


//platform