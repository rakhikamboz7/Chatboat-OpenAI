import asyncHandler from "../middleware/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { validateMessage, validateHistory } from "../utils/validate.js";
import { getChatResponse } from "../services/gemini.service.js";

export const chatHandler = (model, SYSTEM_INSTRUCTIONS) =>
  asyncHandler(async (req, res) => {

    const validation = validateMessage(req.body.message);

    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const message = validation.message;
    const history = validateHistory(req.body.history);

    const geminiHistory = history.map((msg) => ({
      role: msg.role === "bot" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const reply = await getChatResponse(
      model,
      message,
      geminiHistory,
      SYSTEM_INSTRUCTIONS
    );

    res.json({ reply });
  });