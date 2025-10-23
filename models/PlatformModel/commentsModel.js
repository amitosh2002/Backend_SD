import mongoose from "mongoose";
import { uuid } from "uuidv4";

const Comments = new mongoose.Schema({

    id:{
        type:uuid,
        index:true,
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
    mentioned:{
        type:Object,

    },
    timestamps:true
    

})
export const commentModel= mongoose.model('Comments',Comments)