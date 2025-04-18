// src/routes/chat.routes.ts
import { Router, Request, Response } from "express";
import { callDeepSeek } from "../services/deepseek.service";
import { chatRateLimiter } from "../middlewares/rateLimiter"; // 👈 import the limiter
import { callGemini } from "../services/gemini.service";
import { callGroq } from "../services/groq.service";

const router = Router();

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
          reply = await callGemini([{content: prompt, role: "user"}]);
          break;
          case "deepseek":
          reply = await callDeepSeek([{content: prompt, role: "user"}]);
          break;
          case "groq":
          reply = await callGroq([{content: prompt, role: "user"}]);
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
    const { conversation, model } = req.body;

    if (!conversation) {
      res.status(400).json({ error: "Conversation text is required." });
      return;
    }

    try {
      // Craft a prompt for generating a title
      const titlePrompt = `Generate a concise title (max 20 characters no more please) for this conversation in Arabic Egyptian only no english :\n\n${conversation}`;
      var title;
      switch (model) {
        case "gemini":
          title = await callGemini([{ content: titlePrompt, role: "user" }]);
          break;
          case "deepseek":
          title = await callDeepSeek([{ content: titlePrompt, role: "user" }]);
          break;
          case "groq":
          title = await callGroq([{ content: titlePrompt, role: "user" }]);
          break;
        default:
          res.status(400).json({ error: "Invalid model specified." });
          return;
      }

      // Clean up the response if needed (assuming DeepSeek might return extra formatting)
      const cleanedTitle = title.trim().replace(/^"|"$/g, "");

      res.json({ data: cleanedTitle, status: true, message: "Title generated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate conversation title." });
    }
  }
);

export default router;
