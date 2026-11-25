import express from "express";
import { getChatbotReply } from "../services/chatbotService.js";
import { sanitizeText } from "../utils/normalize.js";

const router = express.Router();

router.post("/chat", async (req, res, next) => {
  try {
    const message = sanitizeText(req.body?.message, 500);
    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    const reply = await getChatbotReply(message);
    return res.json(reply);
  } catch (err) {
    return next(err);
  }
});

export default router;
