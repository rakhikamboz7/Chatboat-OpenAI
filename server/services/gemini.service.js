import { GoogleGenerativeAI } from "@google/generative-ai";
import { mapExternalError } from "../utils/errorMapper.js";
import ApiError from "../utils/ApiError.js";

const models = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2]
  .filter(Boolean)
  .map((key) =>
    new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-2.5-flash" })
  );

// Gemini requires strictly alternating user/model turns.
// Consecutive same-role messages cause a 400 — this was the root cause of the 3-message bug.
function sanitizeHistory(rawHistory) {
  const history = [];

  for (const msg of rawHistory) {
    const role = msg.role === "bot" ? "model" : "user";
    const last = history[history.length - 1];
    if (last && last.role === role) continue;
    history.push({ role, parts: [{ text: msg.content }] });
  }

  if (history.length > 0 && history[0].role !== "user") history.shift();
  if (history.length > 0 && history[history.length - 1].role === "user") history.pop();

  return history;
}

// Strip all markdown Gemini might output — responses should be plain conversational text
function cleanResponse(text) {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getChatResponse(message, history, systemInstructions, keyIndex = 0) {
  if (keyIndex >= models.length) {
    throw new ApiError(503, "AI service is temporarily unavailable. Please try again shortly.");
  }

  try {
    const chat = models[keyIndex].startChat({
      history: sanitizeHistory(history),
      systemInstruction: systemInstructions,
    });

    const result = await chat.sendMessage(message);
    return cleanResponse(result.response.text());
  } catch (err) {
    if ((err?.status === 429 || err?.status === 403) && keyIndex + 1 < models.length) {
      console.warn(`Key ${keyIndex + 1} hit quota, retrying with key ${keyIndex + 2}...`);
      return getChatResponse(message, history, systemInstructions, keyIndex + 1);
    }

    // If history caused the 400, retry once with clean context.
    // If the message itself is the problem, the retry will also 400
    // but history will be empty so it won't loop — falls through to mapExternalError.
    if (err?.status === 400 && history.length > 0) {
      console.warn("History caused 400, retrying with cleared context...");
      return getChatResponse(message, [], systemInstructions, keyIndex);
    }

    throw new ApiError(err?.status || 500, mapExternalError(err));
  }
}