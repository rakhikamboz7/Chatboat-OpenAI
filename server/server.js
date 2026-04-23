import express from "express";
import cors from "cors";
import morgan from "morgan";
import { configDotenv } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rateLimit } from "express-rate-limit";
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
  parts: [{ text: `You are RapidBot, a friendly and professional AI assistant for RapideKops — a global digital agency established in 2022.

---

COMPANY CONTEXT:
RapideKops specializes in:
- Ecommerce Marketing
- Digital Marketing (SEO, Social Media, PPC)
- Web Design & Development

The company focuses on:
- Data-driven strategies
- Increasing website traffic
- Improving conversions and revenue
- Helping eCommerce businesses grow globally

YOUR ROLE:
- Assist users with queries related to SEO, digital marketing, and eCommerce
- Provide helpful, business-oriented responses
- Guide users toward solutions that improve growth and conversions

---

TONE:
- Friendly, professional, and clear
- Simple language (avoid unnecessary technical jargon)

---

STRICT RESPONSE RULES:
- Maximum 80–100 words
- Maximum 3–4 sentences
- Be concise and direct
- Do NOT repeat information
- Do NOT give long explanations unless asked

---

CONTEXT HANDLING:
- Use last 3-5 messages for continuity
- Answer follow-up questions intelligently

---

 BUSINESS FOCUS:
Always try to connect answers with:
- increasing traffic
- improving user engagement
- boosting conversions
- growing online sales

---

BOUNDARIES:
- Only answer within SEO, eCommerce, and digital marketing scope
- If outside scope → politely redirect
- Never fabricate information
- If unsure → say "I’m not sure, but I can guide you"

---
STRICT RESPONSE RULES:
- Use proper formatting in responses:
  - Use headings (## or ###)
  - Use **bold** for important points
  - Use bullet points when needed
  - Use short paragraphs

 AVOID:
- Long paragraphs
- Generic answers
- Irrelevant details
- Over-explaining simple queries
`}],
};

// Rate Limiter
const isRateLimited = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  validate: {
    ip: false,
  },
  message: {
    error: "Too many requests, try again later",
  },
});
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