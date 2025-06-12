import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChatMessageInterface {
  role: string;
  content: string;
}

// 📜 Standard call (for things like updating prompts)
export async function callGemini(messages: ChatMessageInterface[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    });

    const textResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContentStream({
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        onData(text);
      }
    }
  } catch (error: any) {
    console.error("Gemini Stream API error:", error.message || error);
    throw new Error("Failed to fetch stream from Gemini.");
  }
}
