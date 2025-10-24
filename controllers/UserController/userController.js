import { TicketModel } from "../../models/TicketModels.js";
import User from "../../models/UserModel.js";
import { analyzeCurrentWeekAndMonthLogs } from "../../utility/platformUtility.js";

export const getUserRescentWork = async (req, res) => {
   
    const { userId } = req.body; 
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
    const { userId } = req.body; 

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
