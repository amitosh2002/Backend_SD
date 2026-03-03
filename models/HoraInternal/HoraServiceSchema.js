import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const HoraServiceSchema = new mongoose.Schema(
  {
    serviceId:{
       type: String,            
           required: true,
           unique: true,
           default: () => uuidv4(),
    },

    key: {
      type: String,
      required: true,
      unique: true // "DORA", "SPRINT_ANALYTICS", etc.
    },

    name: {
      type: String,
      required: true
    },

    description: String,

    isActive: {
      type: Boolean,
      default: true
    },
    status:{
        type:String,
        enum:["ACTIVE","INACTIVE"],
        default:"ACTIVE"
    },
    planType:{
        type:String,
        enum:["FREE","PAID"],
        default:"FREE"
    }
  },
  { timestamps: true }
);

export default mongoose.model("HoraService", HoraServiceSchema);
