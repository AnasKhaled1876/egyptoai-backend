// src/services/callGemini.ts
import axios from "axios";

const geminiApiKey = process.env.GEMINI_API_KEY;

export async function callGemini(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [ {
                text: `You are EgyptoAI, a friendly Egyptian tour guide that speaks in Egyptian Arabic slang. Answer the following question accordingly:\n\n${prompt}`
              }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Gemini API response:", response.data);

    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textResponse || "No response from Gemini.";
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from Gemini.");
  }
}
