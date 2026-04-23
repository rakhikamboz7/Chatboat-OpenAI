import express from "express";
import cors from "cors";
import morgan from "morgan";
import { configDotenv } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

import chatRoutes from "./routes/chat.route.js";
import errorHandler from "./middleware/errorHandler.js";

configDotenv();

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: "10kb" }));

// Gemini Setup
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// System Prompt
const SYSTEM_INSTRUCTIONS = {
  parts: [{ text: "You are a helpful AI assistant." }],
};

// Rate Limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

// Routes
app.use("/api", chatRoutes(model, SYSTEM_INSTRUCTIONS, isRateLimited));

// Health
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});