
import { GoogleGenAI } from "@google/genai";
import { LeadData, LeadType } from "./types";

const PROMPT_SYSTEM_INSTRUCTION = `
You are the ShreeanshTech Lead Intelligence Analyst. 
Your objective is to transform raw conversation transcripts and form data into a high-fidelity Executive Advisory Brief.

ANALYTICAL FRAMEWORK:
1. LEAD CLASSIFICATION:
   - HIGH INTENT: Explicit technical requirements, budget transparency, and a defined deployment window (< 3 months).
   - MEDIUM INTENT: Strategic interest present but fiscal or temporal parameters are still evolving.
   - EARLY STAGE: Informational discovery phase.

2. STRATEGIC INSIGHTS:
   - Identify latent pain points not explicitly stated by the user.
   - Map user needs to specific ShreeanshTech service pillars (Cybersecurity, ERP/Software, AI/Automation, Web Ecosystems).

3. TECHNICAL SPECIFICATIONS:
   - Translate business needs into technical requirements (e.g., "Need to track inventory" -> "Real-time SQL-based inventory management system with API hooks for external logistics").

Ensure the 'Notes for Technical Team' are highly specific, professional, and actionable.
Return a structured JSON object.
`;

export const generateInternalSummary = async (leadData: LeadData, conversationHistory: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    PERFORM STRATEGIC ANALYSIS ON THE FOLLOWING DATASET:
    
    [TRANSCRIPT]
    ${conversationHistory}
    
    [STRUCTURED LEAD DATA]
    ${JSON.stringify(leadData, null, 2)}
    
    DELIVERABLES:
    1. Lead Type (High/Medium/Early).
    2. Executive Summary (Concise but high-impact).
    3. Technical Recommendations & Notes for the Engineering Team.
    
    RETURN FORMAT: JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: PROMPT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating high-fidelity summary:", error);
    return null;
  }
};
