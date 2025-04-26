// src/routes/chat.routes.ts
import { Router, Request, Response } from "express";
import { PrismaClient, Chat } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth";
import { chatRateLimiter } from "../middlewares/rateLimiter";
import { callDeepSeek, callDeepSeekStream } from "../services/deepseek.service";
import { callGemini, callGeminiStream } from "../services/gemini.service";
import { callGroq } from "../services/groq.service";

const prisma = new PrismaClient();
const router = Router();


// Endpoint to return all chat titles for the authenticated user
router.get(
  "/titles",
  authenticateToken, // Ensure the user is authenticated
  async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    try {
      const chats = await prisma.chat.findMany({
        where: { userId },
        select: { id: true, title: true }, // Only return id and title
      });

      res.json({ data: chats, status: true, message: "Chats retrieved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve chat titles." });
    }
  }
);


// Endpoint to return all data of a single chat, including the last 10 messages
router.get(
  "/:chatId",
  authenticateToken, // Ensure the user is authenticated
  async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { chatId } = req.params;

    try {
      // Ensure chatId is a number
      const chatIdAsNumber = parseInt(chatId);

      // Check if the chat belongs to the user
      const chat = await prisma.chat.findUnique({
        where: { id: chatIdAsNumber },
        include: {
          messages: true, // Assuming you want the messages included here
        },
      });

      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ error: "Chat not found or does not belong to the user." });
      }

      // Fetch the last 10 messages for the chat
      const chatMessages = await prisma.chatMessage.findMany({
        where: { chatId: chatIdAsNumber },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          prompt: true,
          reply: true,
          createdAt: true,
        },
      });

      // Reverse the messages to show in chronological order
      chatMessages.reverse();

      res.json({
        data: { chat, messages: chatMessages },
        status: true,
        message: "Chat details retrieved successfully",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve chat details." });
    }
  }
);
router.post(
  "/",
  authenticateToken,
  chatRateLimiter,
  async (req: Request, res: Response) => {
    const { prompt, model, chatId } = req.body;
    const userToken = (req as any).user;
    const userId: number = userToken.userId;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    try {
      res.setHeader("Content-Type", "text/event-stream"); // VERY IMPORTANT
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders(); // send headers now

      let streamer: (text: string) => Promise<void>;

      switch (model) {
        case "gemini":
          streamer = (text) => new Promise(async (resolve) => {
            await callGeminiStream([{ content: prompt, role: "user" }], (chunk: any) => {
              res.write(`data: ${chunk}\n\n`);
            });
            resolve();
          });
          break;
        case "deepseek":
          streamer = (text) => new Promise(async (resolve) => {
            await callDeepSeekStream([{ content: prompt, role: "user" }], (chunk) => {
              res.write(`data: ${chunk}\n\n`);
            });
            resolve();
          });
          break;
        default:
          return res.status(400).json({ error: "Invalid model specified." });
      }

      await streamer(prompt);
      
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process request." });
    }
  }
);



export default router;
