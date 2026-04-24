import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mapExternalError } from "../utils/errorMapper.js";
import ApiError from "../utils/ApiError.js";

const MODEL_PRIMARY = "gemini-2.0-flash-lite";
const MODEL_FALLBACK = "gemini-2.0-flash-lite";

const models = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2]
  .filter(Boolean)
  .map((key, index) =>
    new GoogleGenerativeAI(key).getGenerativeModel({
      model: index === 0 ? MODEL_PRIMARY : MODEL_FALLBACK,
    })
  );

console.log("Keys loaded:", {
  key1: !!process.env.GEMINI_API_KEY_1,
  key2: !!process.env.GEMINI_API_KEY_2,
  modelsCount: models.length,
});

// ✅ FIXED: Strict Gemini-compatible history
function sanitizeHistory(rawHistory = []) {
  const history = [];

  for (const msg of rawHistory) {
    if (!msg?.content?.trim()) continue;

    const role = msg.role === "bot" ? "model" : "user";
    const last = history[history.length - 1];

    // Prevent consecutive same roles
    if (last && last.role === role) continue;

    history.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  // Must start with user
  if (history.length && history[0].role !== "user") {
    history.shift();
  }

  // Must end with model
  if (history.length && history[history.length - 1].role !== "model") {
    history.pop();
  }

  return history;
}

// Clean response
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
  keyIndex = 0
) {
  console.log("Sending to Gemini:", {
    model: MODEL_PRIMARY,
    message,
    historyLength: history.length,
  });

  Validation
  if (!message || typeof message !== "string") {
    throw new ApiError(400, "Invalid message format");
  }

  if (keyIndex >= models.length) {
    throw new ApiError(503, "AI service is unavailable.");
  }

  try {
    const chat = models[keyIndex].startChat({
      history: sanitizeHistory(history),

      systemInstruction: systemInstructions
        ? {
            role: "system",
            parts: [{ text: systemInstructions }],
          }
        : undefined,
    });

    const result = await chat.sendMessage(message);
    return cleanResponse(result.response.text());
  } catch (err) {
    // Retry with next key if quota error
    if ((err?.status === 429 || err?.status === 403) && keyIndex + 1 < models.length) {
      return getChatResponse(message, history, systemInstructions, keyIndex + 1);
    }

    // Retry once without history if bad request
    if (err?.status === 400 && history.length > 0) {
      return getChatResponse(message, [], systemInstructions, keyIndex);
    }

    throw new ApiError(err?.status || 500, mapExternalError(err));
  }
}