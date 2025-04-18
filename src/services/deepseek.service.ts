import axios from "axios";

// Define the message interface with optional content
export interface DeepSeekMessage {
  role?: string;
  content: string;
}

export async function callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
  try {
    // Add the system message at the start of the messages array
    messages.unshift({
      role: "system",
      content: "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang but polite and also helps other with other things other than tourism."
    });
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("DeepSeek API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from DeepSeek.");
  }
}
