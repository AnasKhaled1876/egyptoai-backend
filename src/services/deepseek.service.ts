// src/services/callDeepSeek.ts
import { DEFAULT_SYSTEM_PROMPT } from "../constants/prompts.js";
import axios from "axios";
import { Readable } from "stream";

// Define the message interface
export interface DeepSeekMessage {
  role?: string;
  content: string;
}

type OnDataCallback = (textChunk: string) => void;


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
      content: DEFAULT_SYSTEM_PROMPT
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


export async function callDeepSeekStream(
  messages: DeepSeekMessage[],
  onData: OnDataCallback
): Promise<void> {
  try {
    messages.unshift({
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT
    });

    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages,
        stream: true,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        responseType: 'stream', // Important for streaming
      }
    );

    const stream = response.data as Readable;

    for await (const chunk of stream) {
      const chunkString = chunk.toString('utf-8');
      // console.log('Received chunk:', chunkString);

      // DeepSeek probably sends NDJSON (new-line delimited JSON)
      const lines = chunkString.split('\n').filter((line: string) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonString = line.replace('data: ', '');
          if (jsonString === "[DONE]") {
            console.log("Stream finished");
            return;
          }
          try {
            const parsed = JSON.parse(jsonString);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta !== undefined && delta !== "") {
              onData(delta); // ✅ Only send real text
            }
          } catch (err) {
            console.error('Error parsing DeepSeek chunk:', err);
          }
        }
      }
      
    }
  } catch (error: any) {
    console.error("DeepSeek API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch response from DeepSeek.");
  }
}
