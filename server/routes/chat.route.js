import express from "express";
import { chatHandler } from "../controllers/chat.controller.js";

const router = express.Router();

export default (model, SYSTEM_INSTRUCTIONS, isRateLimited) => {
  router.post("/chat", chatHandler(model, SYSTEM_INSTRUCTIONS, isRateLimited));
  return router;
};