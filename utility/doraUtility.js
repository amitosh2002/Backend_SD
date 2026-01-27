import { GET_SPRINT_ANALYTICS_PROMPT } from "../prompts/AnalyticPrompt/doraPrompt.js"
import { generateVelocityReport } from "../services/geminiService.js"
import { getAppSprintAnalytics } from "./platformUtility.js"
export const getSprintReport=async(sprintIds)=>{

  
    if(sprintIds.length==0) {
        return {message:"No sprint ids provided"}
    }
    const sprintReport=await Promise.all(sprintIds.map(async(sprintId)=>{
        const sprintData=await getAppSprintAnalytics(sprintId)
        return sprintData
    }))
    const prompt = GET_SPRINT_ANALYTICS_PROMPT(sprintReport);
    const analysis = await generateVelocityReport(prompt);
    return analysis
    
}

