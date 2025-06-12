import { PrismaClient } from "@prisma/client";
import { callGemini } from "./src/services/gemini.service.js";

const prisma = new PrismaClient();

const PROMPT_TO_GENERATE = `Generate a list of 8 tourism-related short prompts for an Egyptian travel app.
The list must be parsable:
- Each item starts with an emoji (one emoji only).
- No more than 3 words after the emoji.
Each item must be on a new line, in this exact format:
[emoji] [max 3 words]`;

async function updatePrompts() {
  try {
    console.log('🔄 Starting manual update of quick prompts...');
    
    const response = await callGemini([{ role: "user", content: PROMPT_TO_GENERATE }]);

    const prompts = response.split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.trim());

    console.log('📝 Generated prompts:', prompts);
    
    // Clear old prompts
    const deleteResult = await prisma.quickPrompt.deleteMany();
    console.log(`♻️  Deleted ${deleteResult.count} old prompts`);

    // Create new prompts
    const createPromises = prompts.map(prompt => 
      prisma.quickPrompt.create({ data: { text: prompt } })
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
