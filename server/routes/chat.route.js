import express from "express";
import { chatHandler } from "../controllers/chat.controller.js";

const router = express.Router();

export default (SYSTEM_INSTRUCTIONS, isRateLimited) => {
  router.post("/chat", isRateLimited, chatHandler(SYSTEM_INSTRUCTIONS));
  return router;
};