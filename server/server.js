import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import { rateLimit } from "express-rate-limit";
import chatRoutes from "./routes/chat.route.js";
import errorHandler from "./middleware/errorHandler.js";
import SYSTEM_INSTRUCTIONS from "./config/systemPrompt.js";

configDotenv();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10kb" }));

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  message: { error: "Too many requests — please wait a moment and try again." },
});

app.use("/", chatRoutes(SYSTEM_INSTRUCTIONS, rateLimiter));
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});