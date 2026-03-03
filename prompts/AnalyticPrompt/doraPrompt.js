/**
 * Generates the ultimate multi-chart analytics prompt for Gemini
 * @param {Array} sprintReport - Array of sprint data objects
 */
export const GET_SPRINT_ANALYTICS_PROMPT = (sprintReport) => {
  const recentSprints = sprintReport.slice(-5);

  return `
Context:
You are the Hora AI Agile Analytics Engine.
You analyze sprint performance data and produce structured analytics
for a professional enterprise dashboard.

Your task is to analyze the MOST RECENT sprint
and compare it against the historical average of the previous sprints.

Input Data (Last 5 Sprints, ordered oldest → newest):
${JSON.stringify(recentSprints, null, 2)}

--------------------------------------------------
OUTPUT RULES (VERY IMPORTANT):

1. Return ONLY valid JSON.
2. Do NOT include markdown, explanations, or text outside JSON.
3. All numeric values MUST be numbers (no strings).
4. If historical data is insufficient, set averages to 0 and mention this in warnings.
5. The response MUST strictly follow the schema below.
--------------------------------------------------

Return JSON in this EXACT structure:

{
  "summary": {
    "title": "Sprint Performance Overview",
    "description": "Concise 2–3 sentence executive summary comparing current sprint vs historical average.",
    "status": "HEALTHY | WARNING | CRITICAL",
    "insights": ["Short bullet insight strings"]
  },

  "metrics": {
    "velocity": { "current": number, "average": number },
    "completionRate": { "current": number, "average": number },
    "planningAccuracy": { "current": number, "average": number },
    "taskDensity": { "current": number, "average": number },
    "efficiency": { "current": number, "average": number }
  },

  "charts": {
    "line": {
      "labels": ["Sprint Name or ID"],
      "datasets": [
        { "label": "Velocity", "data": [number] },
        { "label": "Completion Rate", "data": [number] }
      ]
    },

    "radar": {
      "labels": [
        "Velocity",
        "Planning Accuracy",
        "Task Density",
        "Completion Rate",
        "Efficiency"
      ],
      "current": [number],
      "average": [number]
    },

    "gantt": [
      {
        "id": "development",
        "label": "Development",
        "start": number,
        "duration": number,
        "status": "completed | active | planned | stalled"
      },
      {
        "id": "testing",
        "label": "Testing",
        "start": number,
        "duration": number,
        "status": "completed | active | planned | stalled"
      },
      {
        "id": "deployment",
        "label": "Deployment",
        "start": number,
        "duration": number,
        "status": "completed | active | planned | stalled"
      }
    ],

    "quadrant": [
      {
        "label": "Task or Work Group",
        "effort": number,
        "value": number,
        "quadrant": "High Effort High Value | High Effort Low Value | Low Effort High Value | Low Effort Low Value"
      }
    ]
  },

  "forecast": {
    "predictedCapacity": number,
    "confidenceLevel": "HIGH | MEDIUM | LOW | VERY_LOW",
    "confidenceText": "One-line explanation of forecast confidence"
  },

  "warnings": [
    {
      "code": "STRING_CODE",
      "level": "info | warning | critical",
      "message": "Clear human-readable explanation"
    }
  ]
}

--------------------------------------------------
ANALYSIS GUIDELINES:

• Current sprint = latest sprint in input
• Historical average = average of previous sprints
• If only one sprint exists, averages MUST be 0
• Status rules:
    - CRITICAL → 0% completion or velocity
    - WARNING → below historical average
    - HEALTHY → meets or exceeds average
• Insights should be concise and actionable
• Warnings should highlight blockers, anomalies, delays, or data gaps
--------------------------------------------------
`;
};
