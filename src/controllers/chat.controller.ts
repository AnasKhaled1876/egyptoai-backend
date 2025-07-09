import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { callGeminiStream } from "../services/gemini.service.js";
import { callDeepSeekStream } from "../services/deepseek.service.js";
import { transcribeAudioWithWhisper } from "@/services/whisper.service.js";
import fs from "fs";

// Titles
export const getChatTitles = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      select: { id: true, title: true },
    });
    res.json({ data: chats, status: true, message: "Chats retrieved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve chat titles." });
  }
};

// Single chat (last 10 messages)
export const getChatById = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { chatId } = req.params;
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { messages: true },
    });
    if (!chat || chat.userId !== userId) {
      return res.status(404).json({ error: "Chat not found or does not belong to the user." });
    }
    const chatMessages = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, prompt: true, reply: true, createdAt: true },
    });
    chatMessages.reverse();
    res.json({ data: { chat, messages: chatMessages }, status: true, message: "Chat details retrieved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve chat details." });
  }
};

// Streaming chat completion
export const streamChat = async (req: Request, res: Response) => {
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
        streamer = () => new Promise(async (resolve) => {
          await callDeepSeekStream([{ content: prompt, role: "user" }], handleStreamChunk);
          resolve();
        });
        break;
      default:
        return res.status(400).json({ error: "Invalid model specified." });
    }
    if (isAuthenticated) {
      const userId = userToken.userId;
      if (!currentChatId) {
        const newChat = await prisma.chat.create({
          data: {
            title: prompt.substring(0, 50),
            user: { connect: { id: userId } },
          },
        });
        currentChatId = newChat.id;
      }
      await prisma.chat.update({
        where: { id: currentChatId },
        data: { updatedAt: new Date() },
      });
    }
    await streamer(prompt);
    if (isAuthenticated && currentChatId) {
      await prisma.chatMessage.create({
        data: {
          prompt,
          reply: fullResponse,
          chat: { connect: { id: currentChatId } },
        },
      });
      await prisma.chat.update({
        where: { id: currentChatId },
        data: { updatedAt: new Date() },
      });
    }
    res.write(`event: done\ndata: END\n\n`);
    res.end();
  } catch (err) {
    console.error('Error in chat endpoint:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process request.", details: err instanceof Error ? err.message : 'Unknown error' });
    } else {
      res.write('data: ' + JSON.stringify({ error: 'An error occurred during streaming' }) + '\n\n');
      res.end();
    }
  }
};

// Transcribe audio
export const transcribeAudio = async (req: Request, res: Response) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: "Audio file is required." });
  }
  const filePath = req.file.path;
  let transcription = '';
  try {
    // Step 1: Transcribe the audio
    transcription = await transcribeAudioWithWhisper(filePath);
  } catch (err) {
    fs.unlink(filePath, () => {});
    console.error(err);
    return res.status(500).json({ error: "Failed to transcribe audio." });
  } finally {
    // Clean up the uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete uploaded audio:', err);
    });
  }

  // Step 2: Stream the transcription to the chat model (same as streamChat)
  const { model, chatId } = req.body;
  const prompt = transcription;
  const userToken = (req as any).user;
  const isAuthenticated = !!userToken?.userId;
  let currentChatId = chatId;

  if (!prompt) {
    return res.status(400).json({ error: "Transcription is empty." });
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
        streamer = () => new Promise(async (resolve) => {
          await callDeepSeekStream([{ content: prompt, role: "user" }], handleStreamChunk);
          resolve();
        });
        break;
      default:
        streamer = () => new Promise(async (resolve) => {
            await callDeepSeekStream([{ content: prompt, role: "user" }], handleStreamChunk);
            resolve();
          });
          break;
    }

    if (isAuthenticated) {
      const userId = userToken.userId;
      if (!currentChatId) {
        const newChat = await prisma.chat.create({
          data: {
            title: prompt.substring(0, 50),
            user: { connect: { id: userId } },
          },
        });
        currentChatId = newChat.id;
      }
      await prisma.chat.update({
        where: { id: currentChatId },
        data: { updatedAt: new Date() },
      });
    }
    await streamer(prompt);
    if (isAuthenticated && currentChatId) {
      await prisma.chatMessage.create({
        data: {
          prompt,
          reply: fullResponse,
          chat: { connect: { id: currentChatId } },
        },
      });
      await prisma.chat.update({
        where: { id: currentChatId },
        data: { updatedAt: new Date() },
      });
    }
    res.write(`event: done\ndata: END\n\n`);
    res.end();
  } catch (err) {
    console.error('Error in audio chat endpoint:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process request.", details: err instanceof Error ? err.message : 'Unknown error' });
    } else {
      res.write('data: ' + JSON.stringify({ error: 'An error occurred during streaming' }) + '\n\n');
      res.end();
    }
  }
};
