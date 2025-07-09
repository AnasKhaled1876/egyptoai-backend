import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { chatRateLimiter } from "../middlewares/rateLimiter.js";
import { callDeepSeekStream } from "../services/deepseek.service.js";
import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Extract original extension
    const ext = file.originalname.split('.').pop();
    // Use a unique name with the original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
import { getChatTitles, getChatById, streamChat, transcribeAudio } from "../controllers/chat.controller.js";

const router = Router();

router.get("/titles", authenticateToken, getChatTitles);
router.get("/:chatId", authenticateToken, getChatById);
router.post("/", chatRateLimiter, streamChat);
router.post("/transcribe", upload.single('audio'), transcribeAudio);

export default router;
