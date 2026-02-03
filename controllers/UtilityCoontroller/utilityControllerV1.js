import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { getUserDetailById } from "../../utility/platformUtility.js";

export const getAllUserForProject = async (req, res) => {
    try {
        // 1. Get projectId from query params (e.g., /api?projectId=123)
        const { projectId } = req.query; 
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, msg: "User not authenticated" });
        }

        if (!projectId) {
            return res.status(400).json({ success: false, msg: "Project ID is required" });
        }

        // 2. Fetch all accepted members
        const allMemberForProject = await UserWorkAccess.find({
            projectId: projectId,
            userId: { $ne: null },
            status: "accepted",
        }).lean();

        if (!allMemberForProject.length) {
            return res.status(200).json({ success: true, data: [], message: "No members found" });
        }

        // 3. Resolve all async calls for member details correctly
        const memberArray = await Promise.all(
            allMemberForProject.map(async (member) => {
                const memberDetails = await getUserDetailById(member.userId);
                return {
                    id: member.userId,
                    name: memberDetails?.name || "Unknown User",
                    image: memberDetails?.avatar || ""
                };
            })
        );

        // 4. Send proper JSON response
        return res.status(200).json({
            success: true,
            data: memberArray,
            message: "Fetched members for the project successfully"
        });

    } catch (error) {
        console.error("Error in getAllUserForProject:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message 
        });
    }
};
