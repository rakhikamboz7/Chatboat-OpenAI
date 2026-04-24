import asyncHandler from "../middleware/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { validateMessage, validateHistory } from "../utils/validate.js";
import { getChatResponse } from "../services/gemini.service.js";

export const chatHandler = (SYSTEM_INSTRUCTIONS) =>
  asyncHandler(async (req, res) => {
    const validation = validateMessage(req.body.message);

    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const { message } = validation;
    const history = validateHistory(req.body.history);

    const reply = await getChatResponse(message, history, SYSTEM_INSTRUCTIONS);

    res.json({ reply });
  });