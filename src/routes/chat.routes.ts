import { Router, Request, Response } from "express";
import { Chat } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth.js";
import { chatRateLimiter } from "../middlewares/rateLimiter.js";
import { callDeepSeek, callDeepSeekStream } from "../services/deepseek.service.js";
import { callGemini, callGeminiStream } from "../services/gemini.service.js";
import prisma from "../utils/prisma.js";

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
      // Check if the chat belongs to the user
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: true, // Include messages
        },
      });

      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ error: "Chat not found or does not belong to the user." });
      }

      // Fetch the last 10 messages for the chat
      const chatMessages = await prisma.chatMessage.findMany({
        where: { chatId },
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
  chatRateLimiter,
  async (req: Request, res: Response) => {
    const { prompt, model, chatId } = req.body;
    const userToken = (req as any).user;
    const isAuthenticated = !!userToken?.userId;
    let currentChatId = chatId;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      let fullResponse = '';
      const handleStreamChunk = (chunk: string) => {
        fullResponse += chunk;
        res.write(`data: ${chunk}\n\n`);
      };

      let streamer: (text: string) => Promise<void>;

      switch (model) {
        case "gemini":
          streamer = (text) => new Promise(async (resolve) => {
            await callGeminiStream([{ content: prompt, role: "user" }], handleStreamChunk);
            resolve();
          });
          break;
        case "deepseek":
          streamer = (text) => new Promise(async (resolve) => {
            await callDeepSeekStream([{ content: prompt, role: "user" }], handleStreamChunk);
            resolve();
          });
          break;
        default:
          return res.status(400).json({ error: "Invalid model specified." });
      }

      // For authenticated users, create/update chat and save messages
      if (isAuthenticated) {
        const userId = userToken.userId;
        
        // Create a new chat if no chatId provided
        if (!currentChatId) {
          const newChat = await prisma.chat.create({
            data: {
              title: prompt.substring(0, 50), // First 50 chars as title
              user: { connect: { id: userId } },
            },
          });
          currentChatId = newChat.id;
        }

        // Save the user's message
        await prisma.chatMessage.create({
          data: {
            prompt,
            reply: '', // Will be updated after streaming
            chat: { connect: { id: currentChatId } },
          },
        });
      }

      // Process the stream
      await streamer(prompt);
      
      // For authenticated users, update the chat with the full response
      if (isAuthenticated && currentChatId) {
        await prisma.chatMessage.create({
          data: {
            prompt,
            reply: fullResponse,
            chat: { connect: { id: currentChatId } },
          },
        });

        // Update chat's updatedAt timestamp
        await prisma.chat.update({
          where: { id: currentChatId },
          data: { updatedAt: new Date() },
        });
      }
      
      res.end();
    } catch (err) {
      console.error('Error in chat endpoint:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to process request.",
          details: err instanceof Error ? err.message : 'Unknown error'
        });
      } else {
        // If headers are already sent, we can't send a JSON response
        res.write('data: ' + JSON.stringify({ error: 'An error occurred during streaming' }) + '\n\n');
        res.end();
      }
    }
  }
);



export default router;
