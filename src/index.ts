import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chatRoutes from "./routes/chat.routes.js";
import authRoutes from "./routes/auth.routes.js";
import quickPromptsRoutes from "./routes/quickPrompts.routes.js";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Configure Morgan logging
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream (in append mode) for production logging
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Use different logging based on environment
if (process.env.NODE_ENV === 'production') {
  // Log to file in production (Apache combined format)
  app.use(morgan('combined', { 
    stream: accessLogStream,
    skip: (req) => req.path === '/health' // Skip health checks in production logs
  }));
  
  // Also log errors to a separate file
  const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
  );
  
  // Log only 4xx and 5xx responses to error log
  app.use(morgan('combined', {
    stream: errorLogStream,
    skip: (req, res) => res.statusCode < 400
  }));
} else {
  // Use colored dev output in development
  app.use(morgan('dev'));
  
  // Log request body for debugging (only in development)
  app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('Request Body:', req.body);
    }
    next();
  });
}

// Routes
app.use("/api/chat", chatRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/quick-prompts", quickPromptsRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root endpoint
app.get("/", (_req, res) => {
  res.send("Welcome to EgyptoAI Backend 🇪🇬");
});

// Error handling middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
console.log(`🚀 Server is running on http://localhost:${PORT}`);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
