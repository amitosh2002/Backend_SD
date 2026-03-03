import { TicketConfig } from "../models/PlatformModel/TicketUtilityModel/TicketConfigModel.js"
import { GET_SPRINT_ANALYTICS_PROMPT } from "../prompts/AnalyticPrompt/doraPrompt.js"
import { generateVelocityReport } from "../services/geminiService.js"
import { getAppSprintAnalyticsByMapping, getUserDetailById } from "./platformUtility.js"
export const getSprintReport=async(sprintIds)=>{

  
    if(sprintIds.length==0) {
        return {message:"No sprint ids provided"}
    }
    const sprintReport=await Promise.all(sprintIds.map(async(sprintId)=>{
        const sprintData=await getAppSprintAnalyticsByMapping(sprintId)
        return sprintData
    }))
    const prompt = GET_SPRINT_ANALYTICS_PROMPT(sprintReport);
    const analysis = await generateVelocityReport(prompt);

    return parseGeminiResponse(analysis)
    
}













// ================================= cleaner function fot llm response ===================================
/**
 * Helper to extract and parse JSON from Gemini API response
 * @param {Object} rawResponse - The raw response object from Gemini
 * @returns {Object} - The parsed JSON object
 */export const parseGeminiResponse = (rawResponse) => {
  try {
    // STEP 1: If response is string → parse it
    const parsedResponse =
      typeof rawResponse === "string"
        ? JSON.parse(rawResponse)
        : rawResponse;

    // STEP 2: Navigate Gemini structure safely
    const textPart =
      parsedResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("Invalid Gemini response: no text content found");
    }

    // STEP 3: Remove markdown code fences
    const cleanJsonString = textPart
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // STEP 4: Parse final JSON
    const finalJson = JSON.parse(cleanJsonString);

    return finalJson;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
};




/**
 * Processes tickets and returns the velocity matrix
 * @param {Array} tickets - Raw ticket data
 * @param {Object} sets - { doneSet, todoSet, progressSet, testingSet }
 * @param {Object} sprintMap - Map of sprint IDs to Names
 * @returns {Promise<Object>} The populated velocityMatrix
 *//**
 * Processes velocity matrix with asynchronous DB lookups
 */
export const getSprintVelocityMatrix = (tickets, { doneSet, todoSet, progressSet, testingSet }, sprintMap,projectId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const velocityMatrix = {};

      // Pre-fetch all project configurations once to avoid N+1 database queries
      const allConfig = await TicketConfig.find({ projectId }).lean();

      // Map tickets to an array of promises
      const processingPromises = tickets.map(async (ticket) => {
        // 1. Await the DB call for the user
        const user = await getUserDetailById(ticket.assignee);
        
        // Use a unique identifier (like ID) as the key, or the whole object if preferred
        const assigneeKey = user?._id || user?.id || "unassigned";

        // 2. Initialize bucket with a lock-safe check
        if (!velocityMatrix[assigneeKey]) {
          velocityMatrix[assigneeKey] = {
            userId: ticket.assignee,
            userDetails: user, // Keep the full user info for the UI
            totalTodo: 0, todoTickets: [],        
            totalInProgress: 0, inProgressTickets: [],  
            totalTesting: 0, testingTickets: [],
            totalCompleted: 0, completedTickets: [],
            totalMinutes: 0,
            totalStoryPoints: 0,
            allTickets: []
          };
        }

        const points = ticket.storyPoint || ticket.estimatePoints || 0;
        const status = ticket.status?.toUpperCase();

        // Resolve label and priority names from pre-fetched config (allConfig is defined outside map)
        const labelObj = allConfig[0].labels.find((config) => String(config.id) === String(ticket.labels));
        const priorityObj = allConfig[0].priorities.find((config) => String(config.id) === String(ticket.priority));
        console.log("labelObj",labelObj,ticket.label)
        console.log("allConfig",allConfig)
        console.log("priorityObj",priorityObj)
        const ticketInfo = {
          ticketKey: ticket.ticketKey,
          timeLogs: ticket.timeLogs || [],
          tags: labelObj?.name ? [{name:labelObj.name,color:labelObj.color}] : [],
          priority: priorityObj?.name ? [{name:priorityObj.name,color:priorityObj.color}] : [],
          sprintName: sprintMap[ticket.sprint] || "Unknown",
          status: ticket.status,
          storyPoint: points,
          title: ticket.title,
          id: ticket._id
        };

        // 3. Logic checks and categorization
        if (doneSet.has(status)) {
          velocityMatrix[assigneeKey].totalCompleted += 1;
          velocityMatrix[assigneeKey].completedTickets.push(ticketInfo);
        } 
        else if (todoSet.has(status)) {
          velocityMatrix[assigneeKey].totalTodo += 1;
          velocityMatrix[assigneeKey].todoTickets.push(ticketInfo);
        } 
        else if (progressSet.has(status)) {
          velocityMatrix[assigneeKey].totalInProgress += 1;
          velocityMatrix[assigneeKey].inProgressTickets.push(ticketInfo);
        } 
        else if (testingSet.has(status)) {
          velocityMatrix[assigneeKey].totalTesting += 1;
          velocityMatrix[assigneeKey].testingTickets.push(ticketInfo);
        }

        velocityMatrix[assigneeKey].totalStoryPoints += points;
        velocityMatrix[assigneeKey].totalMinutes += (ticket.totalTimeLogged || 0);
        velocityMatrix[assigneeKey].allTickets.push(ticketInfo);
      });

      // 4. Wait for all parallel DB calls and logic to finish
      await Promise.all(processingPromises);

      resolve(velocityMatrix);
    } catch (error) {
      reject(error);
    }
  });
};