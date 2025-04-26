// src/routes/quickPrompts.routes.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const prompts = await prisma.quickPrompt.findMany();
    res.json({ status: true, data: prompts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Failed to fetch prompts" });
  }
});

export default router;
