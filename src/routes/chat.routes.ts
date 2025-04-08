import { Router, Request, Response } from "express";
import { callDeepSeek } from "../services/deepseek.service";

const router = Router();

router.post(
    "/",
    async (req, res) => {
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