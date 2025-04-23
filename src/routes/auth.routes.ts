import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwt";
import { registerUser } from "../controllers/user";

const prisma = new PrismaClient();
const router = Router();

router.post("/signup", registerUser);

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

  const token = generateToken({ userId: user.id });
  res.json({ token, user, status: true, message: "Login successful" });
});

router.post("/check-email", async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid Email." });

  res.json({ status: true, message: "Email is valid" });
});

export default router;
