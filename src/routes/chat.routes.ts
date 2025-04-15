// src/routes/chat.routes.ts
import { Router, Request, Response } from "express";
import { callDeepSeek } from "../services/deepseek.service";
import { chatRateLimiter } from "../middlewares/rateLimiter"; // 👈 import the limiter
import { callGemini } from "../services/gemini.service";
import { callGroq } from "../services/groq.service";

const router = Router();

enum AIModels {
  GEMINI = "gemini",
  DEEPSEEK = "deepseek",
}

router.post(
  "/",
  chatRateLimiter, // 👈 apply the limiter here
  async (req: Request, res: Response) => {
    const { prompt, model } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    try {
      var reply = {};
      switch (model) {
        case "gemini":
          reply = await callDeepSeek(prompt);
          break;
          case "deepseek":
          reply = await callGemini(prompt);
          break;
          case "groq":
          reply = await callGroq(prompt);
          break;
        default:
          res.status(400).json({ error: "Invalid model specified." });
          return;
      }
      res.json({ data: reply, status: true, message: "Success" });
    } catch (err) {
      res.status(500).json({ error: "Failed to get response from AI." });
    }
  }
);

router.post(
  "/title",
  async (req, res) => {
    const { conversation } = req.body;

    if (!conversation) {
      res.status(400).json({ error: "Conversation text is required." });
      return;
    }

    try {
      // Craft a prompt for generating a title
      const titlePrompt = `Generate a concise title (max 10 words) for this conversation:\n\n${conversation}`;
      const title = await callDeepSeek(titlePrompt);

      // Clean up the response if needed (assuming DeepSeek might return extra formatting)
      const cleanedTitle = title.trim().replace(/^"|"$/g, "");

      res.json({ data: cleanedTitle, status: true, message: "Title generated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate conversation title." });
    }
  }
);

export default router;
