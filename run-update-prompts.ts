import { PrismaClient } from "@prisma/client";
import { callGemini } from "./src/services/gemini.service.js";

const prisma = new PrismaClient();

const PROMPT_TO_GENERATE = `Generate a list of 8 tourism-related short prompts in Egyptian Arabic Polite Slang they have to be trendy like live or updated trends please for an Egyptian travel app.
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
    console.log('🔄 Starting manual update of quick prompts...');
    
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

    console.log('📝 Generated prompts:', JSON.stringify(prompts, null, 2));
    
    // Clear old prompts
    const deleteResult = await prisma.quickPrompt.deleteMany();
    console.log(`♻️  Deleted ${deleteResult.count} old prompts`);

    // Create new prompts with emoji and text separated
    const createPromises = prompts.map(({ emoji, text }) => 
      prisma.quickPrompt.create({ 
        data: { 
          emoji: emoji?.trim() || '✨', // Default to sparkle emoji if not provided
          text: (text || '').trim() || 'New Experience' // Default text if empty
        } 
      })
    );
    
    const results = await Promise.all(createPromises);
    console.log(`✅ Successfully created ${results.length} new prompts`);
    
    return results;
  } catch (error) {
    console.error("❌ Failed to update quick prompts:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updatePrompts()
  .then(() => console.log('🎉 Update completed successfully!'))
  .catch(console.error)
  .finally(() => process.exit(0));
