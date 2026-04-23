import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
configDotenv();
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// ─── Gemini Setup ──────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
   });
   
// ─── System Prompt (Brand Personality) ────────────────────────────────────────
const SYSTEM_INSTRUCTIONS = {
  parts: [
    {
      text: `You are RapidBot, a friendly and professional AI assistant for RapidekOps — a digital agency specializing in:
1. SEO Optimization: keyword research, on-page/off-page SEO, link building, content strategy, and driving organic traffic.
2. E-commerce Web Design & Development: building tailored e-commerce platforms with excellent UX, security, and sales-optimized design.

Their core philosophy: "Question everything, see from every perspective, make everything serve universal human values, and expand possibilities."

Guidelines:
- Be warm, helpful, concise, and professional.
- When users ask about services, give clear and compelling answers rooted in the agency's offerings.
- If a question is outside your scope, kindly redirect to RapidekOps' expertise.
- Never fabricate facts. If unsure, say so honestly.
- Keep responses under 120 words unless a detailed explanation is truly needed.`
    }
  ]
};


// ─── Rate Limiting (in-memory, per IP) ────────────────────────────────────────
const rateLimitMap = new Map(); // ip -> { count, resetTime }
const RATE_LIMIT = 20;          // max requests
const RATE_WINDOW = 60 * 1000;  // per 60 seconds

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

// ─── Input Validation ─────────────────────────────────────────────────────────
function validateMessage(message) {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Message must be a non-empty string." };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty." };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: "Message exceeds 500 character limit." };
  }
  return { valid: true, message: trimmed };
}

// translator between chat format and Gemini format
function buildGeminiHistory(history) {
  // history = [{ role: "user"|"bot", content: string }, ...]
  // Gemini expects: [{ role: "user"|"model", parts: [{ text }] }]
  return history.map((msg) => ({
    role: msg.role === "bot" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

// ─── /chat endpoint ───────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Rate limit check
  if (isRateLimited(clientIP)) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment before trying again.",
    });
  }

  // Validate input
  const validation = validateMessage(req.body.message);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { message } = validation;
  // history = last 3-5 messages sent from client
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-5) : [];

  try {
    // Build Gemini chat session with history
    const geminiHistory = buildGeminiHistory(history);

    const chat = model.startChat({
      history: geminiHistory,
      systemInstruction: SYSTEM_INSTRUCTIONS,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return res.json({ reply: responseText });
  } catch (err) {
    console.error("Gemini API error:", err?.message || err);

    // Graceful error responses
    if (err?.status === 429) {
      return res.status(429).json({ error: "AI quota exceeded. Please try again shortly." });
    }
    if (err?.status === 400) {
      return res.status(400).json({ error: "Invalid request to AI service." });
    }

    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(` RapidekOps chat server running on http://localhost:${PORT}`);
});