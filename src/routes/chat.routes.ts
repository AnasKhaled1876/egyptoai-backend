// src/routes/chat.routes.ts
import { Router, Request, Response } from "express";
import { PrismaClient, Chat } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth";
import { chatRateLimiter } from "../middlewares/rateLimiter";
import { callDeepSeek } from "../services/deepseek.service";
import { callGemini } from "../services/gemini.service";
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
      let reply: string;
      switch (model) {
        case "gemini":
          reply = await callGemini([{ content: prompt, role: "user" }]);
          break;
        case "deepseek":
          reply = await callDeepSeek([{ content: prompt, role: "user" }]);
          break;
        case "groq":
          reply = await callGroq([{ content: prompt, role: "user" }]);
          break;
        default:
          return res.status(400).json({ error: "Invalid model specified." });
      }

      let chat: Chat;
      if (chatId) {
        const existing = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!existing) {
          return res.status(404).json({ error: "Chat not found." });
        }
        chat = existing;
      } else {
        // create new chat with placeholder title
        chat = await prisma.chat.create({
          data: { userId, title: "محادثة جديدة" }
        });

        // generate title asynchronously
        const titlePrompt =
          `Generate a concise title (max 20 characters) for this conversation in Egyptian Arabic only:\n\n${prompt}`;
        let generateTitle: Promise<string>;
        switch (model) {
          case "gemini":
            generateTitle = callGemini([{ content: titlePrompt, role: "user" }]);
            break;
          case "deepseek":
            generateTitle = callDeepSeek([{ content: titlePrompt, role: "user" }]);
            break;
          default:
            generateTitle = callGroq([{ content: titlePrompt, role: "user" }]);
        }
        generateTitle.then(async (title) => {
          const cleaned = title.trim().replace(/^"|"$/g, "");
          await prisma.chat.update({
            where: { id: chat.id },
            data: { title: cleaned || "محادثة جديدة" }
          });
        }).catch((err) => console.error("Title generation failed:", err));
      }

      await prisma.chatMessage.create({
        data: { chatId: chat.id, prompt, reply }
      });

      return res.json({ data: { chatId: chat.id, reply }, status: true, message: "Success" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to process request." });
    }
  }
);

export default router;
