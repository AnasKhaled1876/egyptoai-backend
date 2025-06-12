import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { callGemini } from "../services/gemini.service.js";


const prisma = new PrismaClient();

const PROMPT_TO_GENERATE = `Generate a list of 8 tourism-related short prompts for an Egyptian travel app.
For each prompt:
1. Start with exactly one emoji
2. Follow with 1-3 words (keep it very short and catchy)
3. Return as a valid JSON array of objects with 'emoji' and 'text' properties

Example output:
[
  {"emoji": "🏜️", "text": "Desert Safari"},
  {"emoji": "🏛️", "text": "Ancient Temples"}
]

IMPORTANT: Return ONLY the raw JSON array, WITHOUT any markdown code blocks or additional text.`;

async function updatePrompts() {
  try {
    console.log("🔄 Generating new quick prompts...");
    const response = await callGemini([{ role: "user", content: PROMPT_TO_GENERATE }]);
    
    // Clean and parse the JSON response
    const cleanResponse = response
      .replace(/^```(?:json)?\n?|```$/g, '') // Remove markdown code blocks
      .trim();

    let prompts: Array<{emoji?: string, text?: string}>;
    try {
      prompts = JSON.parse(cleanResponse);
      if (!Array.isArray(prompts)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to parse response. Raw response:', response);
      console.error('Cleaned response:', cleanResponse);
      throw new Error(`Invalid response format: ${errorMessage}`);
    }

    // Clear old prompts
    await prisma.quickPrompt.deleteMany();

    // Create new prompts with emoji and text separated
    const createPromises = prompts.map(({ emoji, text }) => 
      prisma.quickPrompt.create({ 
        data: { 
          emoji: emoji?.trim() || '✨', // Default to sparkle emoji if not provided
          text: (text || '').trim() || 'New Experience' // Default text if empty
        } 
      })
    );

    await Promise.all(createPromises);
    console.log(`✅ Successfully created ${prompts.length} quick prompts`);
  } catch (error) {
    console.error("❌ Failed to update quick prompts:", error);
    throw error; // Re-throw to handle in the cron job
  }
}

// 🔥 Run every 12 hours
cron.schedule('0 */12 * * *', async () => {
  console.log('🔄 Running Quick Prompts Update Cron...');
  await updatePrompts();
});
