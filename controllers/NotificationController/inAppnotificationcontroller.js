import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import inAppNotificationSchema from "../../models/NotificationModels/NotificationSchema.js";
import { createBulkNotification, processChartData } from "../../utility/notificationUtility.js";



export const getNotificationForUser = async(req,res)=>{

    try {
        const userId = req.user.userId;
        if(!userId){
            return res.status(400).json({
                success:false,
                message:"User Id is required"
            })
        }

        const notification = await inAppNotificationSchema.find({
            userId:userId,
        }).lean().sort({createdAt:-1}).select("notificationId title message type priority reference isDeleted status createdAt");


        if (notification.length === 0) {
            return res.status(404).json({
                success:false,
                message:"No notification found"
            })
        }
        return res.status(200).json({
            success:true,
            message:"Notification fetched successfully",
            notification
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


export const notificationMarkAsRead = async(req,res)=>{
    try {
        const userId = req.user.userId;
        const {notificationIds} = req.body;

        if(!userId || !notificationIds){
            return res.status(400).json({
                success:false,
                message:"User Id and Notification Id is required"
            })
        }

        const notification = await inAppNotificationSchema.findOneAndUpdate({userId,notificationId:{$in:notificationIds}},{status:1},{new:true}).lean();

        if (!notification) {
            return res.status(404).json({
                success:false,
                message:"Notification not found"
            })
        }
        return res.status(200).json({
            success:true,
            message:"Notification marked as read successfully",
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


export const noficationAnalytics = async(req,res)=>{
    try {
        const userId = req.user.userId;

        if(!userId){
            return res.status(400).json({
                success:false,
                message:"User Id is required"
            })
        }

        const notification = await inAppNotificationSchema.find({userId}).lean();

        const totalNotification = notification.length;
        const unreadNotification = notification.filter((item)=>item.status === 0).length;
        const readNotification = notification.filter((item)=>item.status === 1).length;

        if (notification.length === 0) {
            return res.status(404).json({
                success:false,
                message:"No notification found"
            })
        }

        // we will  continue when the notification is fetched
        // and models will be updated

        const { barData, pieData, lineData } = processChartData(notification);

        const analytics = {
            barData,
            pieData,
            lineData
        }
        
    
        return res.status(200).json({
            success:true,
            message:"Notification fetched successfully",
            analytics,
            totalNotification,
            unreadNotification,
            readNotification
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}

// export const informScrumMasterNotification = async(req,res)=>{
//     try {
//         const userId = req.user.userId;
//         const {projectId} = req.body;

//         if(!userId || !projectId){
//             return res.status(400).json({
//                 success:false,
//                 message:"User Id and Project Id is required"
//             })
//         }


//         const scrumMaster = await UserWorkAccess.find({
//             projectId,
//             accessType:{$gte:300},
//             userId:{$ne:null}

//         }).lean();

//         const scrumMasterIds = scrumMaster.map((item)=>item.userId);
        
//         const uniqueScrumMasterIds = [...new Set(scrumMasterIds)];// remove duplicate ids

//             // 1. Prepare an array of notification objects
//         const notificationsToCreate = uniqueScrumMasterIds.map((smId) => ({
//             userId: smId, // Assign the specific ID for this instance
//             title: "Request for scrum master project configuration approval",
//             message: "Scrum Master has been notified about the configuration issue.",
//             type: 6,
//             priority: 8,
//             reference: {
//                 module: "project",
//                 moduleId: projectId
//             },
//             meta: {
//                 icon: "project",
//                 color: "#FF0000"
//             },
//             isDeleted: false
//         }));

//             // 2. Bulk insert all notifications at once
//             const infromScrumMasterNotification = await inAppNotificationSchema.insertMany(notificationsToCreate);
//                     if (!infromScrumMasterNotification) {
//                         return res.status(404).json({
//                             success:false,
//                             message:"Notification not found"
//                         })
//                     }



//         // const notification = await InAppNotifications.find({userId}).lean();

//         if (infromScrumMasterNotification.length === 0) {
//             return res.status(404).json({
//                 success:false,
//                 message:"No notification found"
//             })
//         }
//         // we will  continue when the notification is fetched
//         // and models will be updated
        
//         return res.status(200).json({
//             success:true,
//             message:"Notification sent successfully",
//         })
        
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Internal Server Error"
//         })
//     }
// }
    

export const informScrumMasterNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {projectId} = req.body;
      if(!userId || !projectId){
            return res.status(400).json({
                success:false,
                message:"User Id and Project Id is required"
            })
        }


        const scrumMaster = await UserWorkAccess.find({
            projectId,
            accessType:{$gte:300},
            userId:{$ne:null}

        }).lean();

        const scrumMasterIds = scrumMaster.map((item)=>item.userId);
        
        const uniqueScrumMasterIds = [...new Set(scrumMasterIds)];// remove duplicate ids

    const notifications = await createBulkNotification({
      userIds: uniqueScrumMasterIds,
      title: "Request for scrum master project configuration approval",
      message: "Scrum Master has been notified about the configuration issue.",
      type: 6,
      priority: 8,
      reference: {
        module: "project",
        moduleId: projectId,
      },
      meta: {
        icon: "project",
        color: "#FF0000",
      },
    });

    if (!notifications.length) {
      return res.status(404).json({
        success: false,
        message: "Notification not created",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Scrum masters notified successfully",
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};