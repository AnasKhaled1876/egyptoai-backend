// src/cron/updatePrompts.ts
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { callDeepSeek } from "../services/deepseek.service"; // or callGemini
import { callGemini } from "../services/gemini.service";

const prisma = new PrismaClient();

const PROMPT_TO_GENERATE = `Generate a list of 8 tourism-related short prompts for an Egyptian travel app.
The list must be parsable:
- Each item starts with an emoji (one emoji only).
- No more than 3 words after the emoji.
Each item must be on a new line, in this exact format:
[emoji] [max 3 words]`;

async function updatePrompts() {
  try {
    const response = await callGemini([{ role: "user", content: PROMPT_TO_GENERATE }]);
    
    const prompts = response.split('\n')
      .filter((line: string) => line.trim() !== '')
      .map((line: string) => line.trim());

    await prisma.quickPrompt.deleteMany(); // clear old prompts

    for (const prompt of prompts) {
      await prisma.quickPrompt.create({
        data: { text: prompt }
      });
    }

    console.log("✅ Quick prompts updated successfully!");
  } catch (error) {
    console.error("Failed to update quick prompts:", error);
  }
}

// Run every 12 hours
cron.schedule('0 */12 * * *', () => {
  console.log('🔄 Running Quick Prompts Update Cron...');
  updatePrompts();
});
