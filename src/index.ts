import dotenv from "dotenv";
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chatRoutes from "./routes/chat.routes.js";
import authRoutes from "./routes/auth.routes.js";
import quickPromptsRoutes from "./routes/quickPrompts.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import countryRoutes from "./routes/country.routes.js";
import legalRoutes from "./routes/legal.routes.js";
// Initialize Redis connection
import { initRedis } from "./utils/redis.js";

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

app.use("/api/profile", profileRoutes);

app.use("/api/quick-prompts", quickPromptsRoutes);
app.use("/api/countries", countryRoutes);
app.use('/legal', legalRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

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

// Initialize Redis and start the server
const startServer = async () => {
  try {
    // Initialize Redis connection
    await initRedis();
    console.log('Redis connected successfully');
    
    // Create HTTP server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
      // console.log(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      // Handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          console.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });

      // Force close server after 5 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };

    // Handle termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider whether to exit here or continue
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Consider whether to exit here or continue
  // process.exit(1);
});

console.log('Process terminated');
