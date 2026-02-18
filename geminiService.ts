
import { GoogleGenAI } from "@google/genai";
import { LeadData, LeadType } from "./types";

const PROMPT_SYSTEM_INSTRUCTION = `
You are ShreeanshTech AI Support & Solutions Consultant, a professional IT advisory representative.
Your tone is consultative, confident, and business-oriented.

Based on the provided conversation history and collected data, your task is to:
1. Determine the 'Lead Type' (High Intent, Medium Intent, or Early Stage).
   - High Intent: Clear requirements, specific budget, and immediate timeline.
   - Medium Intent: Clear requirements but vague on budget or timeline.
   - Early Stage: Just exploring options.
2. Generate a 'Notes for Technical Team' section that highlights technical complexities or specific opportunities.
3. Consolidate all information into a structured internal summary.

Return a JSON object that matches the lead summary structure.
`;

export const generateInternalSummary = async (leadData: LeadData, conversationHistory: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this conversation and structured data:
    
    CONVERSATION HISTORY:
    ${conversationHistory}
    
    STRUCTURED DATA:
    ${JSON.stringify(leadData, null, 2)}
    
    Please provide:
    1. Lead Type Assessment.
    2. Executive Summary of needs.
    3. Technical Notes.
    
    Return as JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
};
