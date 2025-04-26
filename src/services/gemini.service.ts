import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


// src/services/callGemini.ts
import axios from "axios";

const geminiApiKey = process.env.GEMINI_API_KEY;

interface ChatMessageInterface {
  role?: string;
  content?: string;
}

export async function callGemini(messages: ChatMessageInterface[]): Promise<string> {
  try {
    // Simulate conversation by concatenating messages

    // Add the system message at the start of the messages array
    messages.unshift({
      role: "system",
      content: "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang."
    });

    const fullPrompt = messages.map(m => {
      if (m.role === "system") return `Instruction: ${m.content}`;
      if (m.role === "user") return `User: ${m.content}`;
      if (m.role === "assistant") return `Assistant: ${m.content}`;
      return "";
    }).join("\n");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textResponse || "No response from Gemini.";
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from Gemini.");
  }
}


export async function callGeminiStream(messages: { role: string, content: string }[], onData: (chunk: string) => void) {
  try {
    const systemInstruction = "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang but polite and also helps other with other things other than tourism.";

    messages[0].content = `${systemInstruction}\n\nUser input: ${messages[0].content}`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const chat = model.startChat({ history: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    })) });

    const result = await chat.sendMessageStream(messages[messages.length - 1].content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        onData(text);
      }
    }
  } catch (error: any) {
    console.error("Gemini API error:", error.message || error);
    throw new Error("Failed to fetch response from Gemini.");
  }
}
