import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { telegramRestRouter } from "../telegramRestApi";
import telegramVoiceRouter from "../telegramVoiceApi";
import telegramRegistrationRouter from "../telegramRegistrationApi";
import telegramBotRouter from "../telegramBotApi";
import telegramNotificationRouter from "../telegramNotificationApi";
import schedulerRouter from "../schedulerApi";
import { initializeScheduler, stopScheduler } from "./scheduler";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Telegram REST API for n8n integration
  app.use("/api/telegram", telegramRestRouter);
  // Telegram Voice Transcription API
  app.use("/api/telegram", telegramVoiceRouter);
  // Telegram Contractor Registration API
  app.use("/api/telegram", telegramRegistrationRouter);
  // Telegram Bot Query API
  app.use("/api/telegram", telegramBotRouter);
  // Telegram Notification API
  app.use("/api/telegram", telegramNotificationRouter);
  // Scheduler API
  app.use("/api/scheduler", schedulerRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  
  // Initialize scheduled tasks
  initializeScheduler();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping scheduler...');
    stopScheduler();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping scheduler...');
    stopScheduler();
    process.exit(0);
  });
  });
}

startServer().catch(console.error);
