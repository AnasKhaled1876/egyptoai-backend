import axios from "axios";

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

export async function callDeepSeek(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat", // or whatever model you're using
        messages: [
          { role: "system", content: "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("DeepSeek API response:", response.data);

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("DeepSeek API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from DeepSeek.");
  }
}
