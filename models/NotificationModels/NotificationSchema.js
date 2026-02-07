import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";




    // insted of enum we are gono to use the inter basesed indexex value for traking to maintain in the globa; tool box for adding new notification type 
   // enum: [
      //   "TICKET",-0
      //   "MESSAGE",-2
      //   "TEAM", 3
      //   "SYSTEM",4
      //   "PAYMENT",5
      //   "INTEGRATION", 6
      //   "SPRINT". 7
      // ], 

//   enum: ["LOW", "NORMAL", "HIGH"], - it will be used for notification priority for number level 7 - low 8-medium 9- hard







const inAppNotificationSchema = new mongoose.Schema(
  {
    notificationId:{
         type: String,            
                 required: true,
                 unique: true,
                 default: () => uuidv4(),
    },
    userId: {
      type:String,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    // Ticket | Message | Team | System | Payment | etc.
    type: {
      type: Number,
   
      required: true,
      index: true
    },

    // Used to deep-link on click
    reference: {
      module: {
        type: String, // ticket, chat, project, asset, etc.
      },
      moduleId: {
        type: String
      }
    },

    status: {
      type: Boolean,// 0 for not readed and 1 for readed 
      default: 0,
      index: true
    },

    priority: {
      type: Number,
      default: 8
    },

    // For UI icons/colors
    meta: {
      icon: String,
      color: String
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true // createdAt = "5 minutes ago"
  }
);
const InAppNotification = mongoose.model("inAppNotification", inAppNotificationSchema);
export default InAppNotification;
