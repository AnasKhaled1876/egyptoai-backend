import { DEFAULT_SYSTEM_PROMPT } from '../constants/prompts.js';
import {GoogleGenAI} from '@google/genai';


const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

interface ChatMessageInterface {
  role: string;
  content: string;
}

// 📜 Standard call (for things like updating prompts)
export async function callGemini(messages: ChatMessageInterface[]): Promise<string> {
  try {
    messages.unshift({
      role: "model",
      content: DEFAULT_SYSTEM_PROMPT
    });
    var result =  await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: messages.map(m => ({
        parts: [{ text: m.content }]
      })),
    });

    // const textResponse = result.text.candidates?.[0]?.content?.parts?.[0]?.text;
    const textResponse = result.text;
    return textResponse || "No response from Gemini.";
  } catch (error: any) {
    console.error("Gemini API error:", error.message || error);
    throw new Error("Failed to fetch response from Gemini.");
  }
}

// 🌊 Streaming call (for real-time streaming replies)
export async function callGeminiStream(
  messages: ChatMessageInterface[],
  onData: (chunk: string) => void
) {
  try {
    messages.unshift({
      role: "model",
      content: DEFAULT_SYSTEM_PROMPT
    });
    const result = await genAI.models.generateContentStream({
      model: 'gemini-2.0-flash-001',
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        onData(text);
      }
    }

  } catch (error: any) {
    console.error("Gemini Stream API error:", error.message || error);
    throw new Error("Failed to fetch stream from Gemini.");
  }
}
