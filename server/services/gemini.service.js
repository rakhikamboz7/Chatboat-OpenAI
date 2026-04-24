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

function sanitizeHistory(rawHistory = []) {
  const history = [];

  for (const msg of rawHistory) {
    if (!msg?.content?.trim()) continue;

    const role = msg.role === "bot" ? "model" : "user";
    const last = history[history.length - 1];

    if (last && last.role === role) continue;

    history.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  if (history.length && history[0].role !== "user") {
    history.shift();
  }

  if (history.length && history[history.length - 1].role !== "model") {
    history.pop();
  }

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

// ✅ FIX: Reliably extract status code from Google SDK errors
function getErrorStatus(err) {
  return (
    err?.status ||
    err?.statusCode ||
    err?.response?.status ||
    err?.error?.code ||
    (err?.message?.includes("429") ? 429 : null) ||
    (err?.message?.includes("quota") ? 429 : null) ||
    (err?.message?.includes("403") ? 403 : null) ||
    500
  );
}

export async function getChatResponse(
  message,
  history = [],
  systemInstructions = "",
  keyIndex = 0
) {
  console.log("Sending to Gemini:", {
    model: keyIndex === 0 ? MODEL_PRIMARY : MODEL_FALLBACK,
    message,
    historyLength: history.length,
    keyIndex,
  });

  if (!message || typeof message !== "string") {
    throw new ApiError(400, "Invalid message format");
  }

  if (keyIndex >= models.length) {
    throw new ApiError(503, "All AI keys are exhausted. Please try again later.");
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
    const status = getErrorStatus(err);

    console.warn(`Gemini key[${keyIndex}] failed with status ${status}:`, err?.message);

    // ✅ Retry with next key on rate limit or auth error
    if ((status === 429 || status === 403) && keyIndex + 1 < models.length) {
      console.log(`Switching to key[${keyIndex + 1}]...`);
      return getChatResponse(message, history, systemInstructions, keyIndex + 1);
    }

    // ✅ Retry once without history on bad request
    if (status === 400 && history.length > 0) {
      console.log("Retrying without history...");
      return getChatResponse(message, [], systemInstructions, keyIndex);
    }

    throw new ApiError(status, mapExternalError(err));
  }
}