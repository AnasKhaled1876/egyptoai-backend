import dotenv from "dotenv";
dotenv.config();

import factsRouter from "./routes/facts";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoutes);

app.use("/api/facts", factsRouter);

app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => {
  res.send("Welcome to EgyptoAI Backend 🇪🇬");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


// const messages = [
//   { role: "system", content: "You are EgyptoAI, a friendly Egyptian tour guide that speaks Egyptian Arabic slang." },
//   { role: "user", content: "فين الأهرامات؟" },
//   { role: "assistant", content: "الأهرامات في الجيزة يا باشا، ودي من أعظم المعالم في العالم!" },
//   { role: "user", content: "طيب الأسعار عاملة كام؟" }
// ];
