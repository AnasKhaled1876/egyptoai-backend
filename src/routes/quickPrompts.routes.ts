import { Router, Request, Response } from "express";
import prisma from "../utils/prisma.js";

const router = Router();

/**
 * @route GET /quick-prompts
 * @description Get all quick prompts
 * @returns {Promise<QuickPrompt[]>} List of quick prompts
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const prompts = await prisma.quickPrompt.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        emoji: true,
        text: true,
        createdAt: true
      }
    });
    
    // Transform the data to match the expected frontend format
    const formattedPrompts = prompts.map(prompt => ({
      emoji: prompt.emoji,
      text: prompt.text,
      createdAt: prompt.createdAt
    }));
    
    res.json({ status: true, data: formattedPrompts });
  } catch (err) {
    console.error('Error fetching quick prompts:', err);
    res.status(500).json({ 
      status: false, 
      message: "Failed to fetch prompts",
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;
