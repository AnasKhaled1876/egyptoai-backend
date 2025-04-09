// src/routes/chat.routes.ts
import { Router, Request, Response } from "express";
import { callDeepSeek } from "../services/deepseek.service";
import { chatRateLimiter } from "../middlewares/rateLimiter"; // 👈 import the limiter

const router = Router();

router.post(
  "/",
  chatRateLimiter, // 👈 apply the limiter here
  async (req: Request, res: Response) => {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    try {
      const reply = await callDeepSeek(prompt);
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ error: "Failed to get response from AI." });
    }
  }
);

export default router;
