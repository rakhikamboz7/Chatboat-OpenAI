import "dotenv/config";
import Groq from "groq-sdk";
import { mapExternalError } from "../utils/errorMapper.js";
import ApiError from "../utils/ApiError.js";

const MODEL = "llama-3.3-70b-versatile";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


if(!process.env.GROQ_API_KEY) {
  console.warn("Warning: GROQ_API_KEY is not set. Please add it to your environment variables to enable Groq integration.");
}

console.log("Groq loaded:", {
  apiKey: !!process.env.GROQ_API_KEY,
  model: MODEL,
});

function sanitizeHistory(rawHistory = []) {
  const history = [];

  for (const msg of rawHistory) {
    if (!msg?.content?.trim()) continue;

    const role = msg.role === "bot" ? "assistant" : "user"; // Groq uses "assistant" not "model"
    const last = history[history.length - 1];

    if (last && last.role === role) continue;

    history.push({ role, content: msg.content });
  }

  if (history.length && history[0].role !== "user") history.shift();
  if (history.length && history[history.length - 1].role !== "assistant") history.pop();

  return history;
}

function cleanResponse(text = "") {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getChatResponse(
  message,
  history = [],
  systemInstructions = "",
  retried = false
) {
  console.log("Sending to Groq:", {
    model: MODEL,
    message,
    historyLength: history.length,
  });

  if (!message || typeof message !== "string") {
    throw new ApiError(400, "Invalid message format");
  }

  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(503, "Groq API key is missing.");
  }

  // Build messages array
  const messages = [
    ...(systemInstructions
      ? [{ role: "system", content: systemInstructions }]
      : []),
    ...sanitizeHistory(history),
    { role: "user", content: message },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = completion.choices?.[0]?.message?.content;

    if (!text) {
      throw new ApiError(500, "Empty response from Groq");
    }

    return cleanResponse(text);

  } catch (err) {
    if (err instanceof ApiError) throw err;

    const status = err?.status || err?.statusCode || 500;

    console.warn(`Groq failed with status ${status}:`, err?.message);

    // Retry once without history on bad request
    if (status === 400 && history.length > 0 && !retried) {
      console.log("Retrying without history...");
      return getChatResponse(message, [], systemInstructions, true);
    }

    if (status === 429) {
      throw new ApiError(429, "Too many requests. Please wait a moment and try again.");
    }

    throw new ApiError(status, mapExternalError(err));
  }
}