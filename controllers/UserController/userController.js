import { analyzeCurrentWeekAndMonthLogs, getProjectBoardWithFallback, getProjectFlowWithFallback } from "../../utility/platformUtility.js";
import ScrumProjectFlow from "../../models/PlatformModel/SprintModels/confrigurator/workFlowModel.js";
import { ProjectModel } from "../../models/PlatformModel/ProjectModels.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import User from "../../models/UserModel.js";
import { TicketConfig } from "../../models/PlatformModel/TicketUtilityModel/TicketConfigModel.js";
// import { analyzeCurrentWeekAndMonthLogs } from "../../utility/platformUtility.js";

export const getUserRescentWork = async (req, res) => {
   
    // const { userId } = req.body;
    const userId= req.user.userId;
    if (!userId) {
        return res.status(400).json({ msg: "User ID is required" });
    }

    try {
        // 1. Fetch User Details
        // Use findById for efficiency when querying by _id
        const userDetails = await User.findById(userId).select('username'); 
        
        if (!userDetails) {
            return res.status(404).json({ msg: "User not found" });
        }
        
        const username = userDetails.username;

        // 2. Fetch Recent Tickets
     
        const rescentWork = await TicketModel.find({
            status: { $ne: "OPEN" }, // Filter out tickets with status "OPEN"
            $or: [
                { reporter: username }, // Assuming 'reporter' field stores username
                { assignee: username }  // Assuming 'assignee' field stores username
                // Note: If assignee stores the whole user object or ID, adjust this query
            ]
        })
        .sort({ createdAt: -1 }) // Sort descending by createdAt (most recent first)
        .limit(10) // Limit to a reasonable number of recent items
        .select('_id title priority ticketKey status createdAt'); // Select only necessary fields

        // 3. Prepare the Response Data
        // The query results are already filtered, sorted, and clean, so we can map them directly.
        // const allRescentWork = await TicketModel.find({
        //     status: { $ne: "OPEN" }, // Filter out tickets with status "OPEN"
        //     $or: [
        //         { reporter: username }, // Assuming 'reporter' field stores username
        //         { assignee: username }  // Assuming 'assignee' field stores username
        //         // Note: If assignee stores the whole user object or ID, adjust this query
        //     ]
        // })
        // .sort({ createdAt: -1 }) // Sort descending by createdAt (most recent first)
        // .select('_id title priority ticketKey status createdAt'); 
        const rescentWorkItems = rescentWork.map(work => ({
            ticketID: work._id,
            ticketTittle: work.title,
            ticketPriority: work.priority,
            ticketKey: work.ticketKey,
            ticketStatus: work.status,
            createdAt: work.createdAt,
        }));

        // 4. Return Success Response
        return res.status(200).json({
            success: true,
            data: rescentWorkItems
        });

    } catch (error) {
        console.error("Error fetching user recent work:", error);
        return res.status(500).json({ 
            success: false,
            msg: "Internal server error", 
            error: error.message 
        });
    }
};


export const getUserTimeLog = async (req, res) => {
    // const { userId } = req.body; 
    const userId= req.user.userId;

    if (!userId) {
        return res.status(401).json({ msg: "User ID is required" });
    }
    
    try {
        // 1. Fetch User
        const user = await User.findById(userId).select('username'); 
        if (!user || !user.username) {
             return res.status(404).json({ msg: "User not found or missing username" });
        }
        
        // 2. Fetch Work Logs
        const allWorkTimelog = await TicketModel.find({
            status: { $ne: "OPEN" }, 
            assignee: user.username, // Query by username
        })
        .sort({ createdAt: -1 })
        .limit(50) // Increased limit to ensure better time sample
        .select('timeLogs totalTimeLogged'); // Only need time log fields for aggregation

        
        let totalWorkTime = 0;
        const allTimeLogs = [];
        
        // 3. ⚠️ FIX 2 & 3: Use for...of loop and flatten data
        for (const workItem of allWorkTimelog) {
            // Accumulate total time from the ticket document
            if (typeof workItem.totalTimeLogged === 'number') {
                totalWorkTime += workItem.totalTimeLogged;
            }

            // Flatten the individual timeLogs array into the master array
            if (Array.isArray(workItem.timeLogs) && workItem.timeLogs.length > 0) {
                allTimeLogs.push(...workItem.timeLogs);
            }
        }

        // 4. ⚠️ FIX 4: Call aggregation function once on the flattened data
        const currentWeekAndMonthAnalysis = analyzeCurrentWeekAndMonthLogs(allTimeLogs);

        // 5. Send Response
        return res.status(200).json({
            success: true,
            user: user.username,
            totalWorkTime: totalWorkTime, // Total time logged across all tickets
            currentWeekAndMonth: currentWeekAndMonthAnalysis, // Detailed current week breakdown
            recentTickets: allWorkTimelog.map(t => ({ // Optional: return a concise list of tickets
                title: t.title, 
                ticketKey: t.ticketKey,
                totalTimeLogged: t.totalTimeLogged
            }))
        });

    } catch (error) {
        console.error("Error fetching user time log:", error);
        return res.status(500).json({ msg: "Internal server error", error: error.message });
    }
};
export const getUserTeamDetails = async (req, res) => {
    try {
        console.log("getUserTeamDetails called, req.user:", req.user);
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const userId = req.user.userId;

        // 1. Projects this user belongs to
        const userProjectIds = await UserWorkAccess
            .find({ userId })
            .distinct('projectId');

        if (!userProjectIds.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        // 2. Actual projects
        const projects = await ProjectModel.find({
            projectId: { $in: userProjectIds }
        }).select('projectId projectName status');

        // 3. All accepted members for those projects (NO accessType filter)
        const teamAccess = await UserWorkAccess.find({
            projectId: { $in: userProjectIds },
            status: "accepted"
        }).populate('userId', 'username email profile accessType status');

        // 4. Attach members to projects
        const result = projects.map(project => {
            const members = teamAccess
                .filter(access =>
                    access.projectId.toString() === project.projectId.toString()
                )
                .map(access => access.userId)
                .filter((user, index, self) =>
                    user &&
                    self.findIndex(u => u._id.toString() === user._id.toString()) === index
                );

            return {
                projectId: project.projectId,
                projectName: project.projectName,
                status: project.status,
                members
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const getUserWorkDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        let projectId = req.query.projectId;

        // Strip quotes if present
        if (projectId && projectId.startsWith('"') && projectId.endsWith('"')) {
            projectId = projectId.substring(1, projectId.length - 1);
        }

        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }
        // // Fetch username since TicketModel.assignee stores username
        // const user = await User.findById(userId).select('username');
        // if (!user) {
        //     return res.status(404).json({ success: false, message: "User not found" });
        // }
        // const username = user.username;

        // Fetch board flow for status mapping with automatic fallback
        const flow = await getProjectBoardWithFallback(projectId);
        const boardColumns = flow?.columns || [];

        // Fetch all user tickets for this project to distribute dynamically
        const allTickets = await TicketModel.find({ projectId, assignee: userId }).lean();

        const ticketConfigArr = await TicketConfig.find({ projectId }).select("priorities labels").lean();
        const priorities = ticketConfigArr.length > 0 ? (ticketConfigArr[0].priorities || []) : [];
        const labels = ticketConfigArr.length > 0 ? (ticketConfigArr[0].labels || []) : [];

        const mapTicket = (item) => {
            const priorityObj = priorities.find(p => p.id === (Array.isArray(item.priority) ? item.priority[0] : item.priority));
            const labelObj = labels.find(l => l.id === (Array.isArray(item.labels) ? item.labels[0] : item.labels));
            return {
                ticketKey: item.ticketKey,
                title: item.title,
                status: item.status,
                label: labelObj ? labelObj.name : "Unknown",
                priority: priorityObj ? priorityObj.name : "Unknown",
                timeLogs: item.timeLogs,
                totalTimeLogged: item.totalTimeLogged,
                createdAt: item.createdAt,
                id: item._id
            };
        };


        const boardWork = boardColumns.map((col) => {
            const columnTickets = allTickets.filter(t => {
                const ticketStatus = (t.status || "").toUpperCase().replace(/[_\s]/g, "");
                const columnStatusKeys = (col.statusKeys || []).map(s => s.toUpperCase().replace(/[_\s]/g, ""));
                return columnStatusKeys.includes(ticketStatus);
            });
            return {
                columnId: col.columnId || col.id,
                name: col.name,
                Name: col.name,
                color: col.color,
                statusKeys: col.statusKeys,
                Status: col.statusKeys,
                tickets: columnTickets
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(mapTicket)
            };
        });

        res.status(200).json({
            success: true,
            data: boardWork
        });
    } catch (error) {
        console.error("Error in getUserWorkDetails:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getUserCalanderTimeline = async(req,res)=>{
    try {

        const userId = req.user.userId;


        const userWorkingProject = await UserWorkAccess.find({
            projectId,
            userId,
            status:"accepted"  }).lean();


        const projectIds = userWorkingProject.map(project => project.projectId);

        // =====================================USER TICKET ETA ============
        const ticketETA = await TicketModel.aggregate([
            {
                $match: {
                    projectId: { $in: projectIds },
                    assignee: userId
                }
            },
            {
                $group: {
                    _id: "$ticketKey",
                    eta: { $max: "$eta" }
                }
            }
        ]);





        // =====================================USER TICKET ETA ============

        
    } catch (error) {
        
    }
}