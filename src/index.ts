import chatRoutes from "./routes/chat.routes";
import factsRouter from "./routes/facts";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ This is correct
app.use("/api/chat", chatRoutes);

app.use("/api/facts", factsRouter);

app.get("/", (_req, res) => {
  res.send("Welcome to EgyptoAI Backend 🇪🇬");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
