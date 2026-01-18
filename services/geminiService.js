// services/geminiService.js
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
let geminiClient = null;
let isGeminiConfigured = false;
if (API_KEY) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: API_KEY });
    isGeminiConfigured = true;
  } catch (err) {
    // don't crash on import — keep gemini disabled and log a warning
    console.warn("Failed to instantiate Gemini client. Gemini disabled.", err.message || err);
    isGeminiConfigured = false;
  }
} else {
  // No API key — Gemini is disabled but server should continue running
  console.warn("GEMINI_API_KEY not set — Gemini features will be disabled.");
}

// helper to generate text given a prompt (returns text)
export async function generateVelocityReport(prompt, model = process.env.GEMINI_MODEL || "gemini-2.5-flash") {
  if (!isGeminiConfigured || !geminiClient) {
    // return a helpful placeholder instead of throwing — this keeps endpoints working
    return (
      "[Gemini disabled - set GEMINI_API_KEY to enable AI-generated reports].\n" +
      "Provided prompt summary:\n" +
      (typeof prompt === "string" ? prompt.slice(0, 1000) : JSON.stringify(prompt))
    );
  }

  const resp = await geminiClient.models.generateContent({
    model,
    contents: prompt,
  });
  // depending on SDK version, response.text or resp.output[0].content[0].text etc.
  // SDK commonly provides resp.text() or resp.output; handle both:
  if (typeof resp.text === "function") return resp.text();
  if (resp.output && resp.output[0] && resp.output[0].content && resp.output[0].content[0]) {
    return resp.output[0].content[0].text || JSON.stringify(resp.output);
  }
  return JSON.stringify(resp);
}

// exported for feature-flagging or health-checks
export const geminiEnabled = isGeminiConfigured;

