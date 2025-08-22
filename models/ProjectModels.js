import mongoose from "mongoose";

const Projects = new mongoose.Schema({
  name: {   
    type: String,
    required: true,
    trim: true,
  },
    description: {
    type: Object,
    required: true,

    },


    startDate: {        
    type: Date,
    required: true,
        

    },
})

export const ProjectModel = mongoose.model("Projects", Projects);