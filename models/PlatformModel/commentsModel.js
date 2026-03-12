import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const Comments = new mongoose.Schema({

  id: {
      type: String,
      default: uuidv4,
      index: true
    },

    partnerId:{
        type:String,
        require:true,
         ref: 'Partner',
    },
    projectId:{
        required:true,
        type:String,
        ref:'Project'
    },
    ticketId:{
        type:String,
        ref:"Ticket",
        required:true,
        
    },
    comment:{
        type:String,
    },
    authorId:{
        type:String, // userId who created comment
        required:true,
    },
    mentioned:{
        type: [Object], // array of mentioned users {userId, username}
        default: []
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    parentId: {
        type: String,
        ref: 'Comments',
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    }
  },
  {
    timestamps: true
  }
)
export const commentModel= mongoose.model('Comments',Comments)