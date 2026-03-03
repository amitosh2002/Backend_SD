import { z } from "zod";

export const GeminiSprintAnalyticsSchema = z.object({
  summary: z.object({
    title: z.string(),
    description: z.string(),
    status: z.string(),
    insights: z.array(z.string()),
  }),

  metrics: z.object({
    velocity: z.object({
      current: z.number(),
      average: z.number(),
    }),
    completionRate: z.object({
      current: z.number(),
      average: z.number(),
    }),
    planningAccuracy: z.object({
      current: z.number(),
      average: z.number(),
    }),
    taskDensity: z.object({
      current: z.number(),
      average: z.number(),
    }),
    efficiency: z.object({
      current: z.number(),
      average: z.number(),
    }),
  }),

  charts: z.object({
    line: z.object({
      labels: z.array(z.string()),
      datasets: z.array(
        z.object({
          label: z.string(),
          data: z.array(z.number()),
        })
      ),
    }),

    radar: z.object({
      labels: z.array(z.string()),
      current: z.array(z.number()),
      average: z.array(z.number()),
    }),

    gantt: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        start: z.number(),
        duration: z.number(),
        status: z.string(),
      })
    ),

    quadrant: z.array(
      z.object({
        label: z.string(),
        effort: z.number(),
        value: z.number(),
        quadrant: z.string(),
      })
    ),
  }),

  forecast: z.object({
    predictedCapacity: z.number(),
    confidenceLevel: z.string().optional(),
    confidenceText: z.string().optional(),
  }),

  warnings: z.array(
    z.object({
      code: z.string(),
      level: z.string(),
      message: z.string(),
    })
  ),
});
