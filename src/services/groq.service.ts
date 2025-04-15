// src/services/callGroq.ts
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function callGroq(prompt: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192", // or "llama3-8b-8192" depending on your plan
      messages: [
        {
          role: "system",
          content: "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content;
    return response || "No response from Groq.";
  } catch (error: any) {
    console.error("Groq API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from Groq.");
  }
}
