import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { createNotification } from "../services/notificationService.js";
import { sanitizeText } from "../utils/normalize.js";
import { isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/conversations", async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const { data: conversations, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const otherIds = [
      ...new Set(
        (conversations || []).map((c) => (c.participant_one === userId ? c.participant_two : c.participant_one))
      ),
    ];

    const [{ data: users }, { data: unreadMessages }] = await Promise.all([
      otherIds.length > 0
        ? supabaseAdmin.from("profiles").select("id, full_name, email, role, avatar_url").in("id", otherIds)
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("messages")
        .select("conversation_id")
        .eq("receiver_id", userId)
        .eq("is_read", false),
    ]);

    const userMap = new Map((users || []).map((u) => [u.id, u]));
    const unreadMap = new Map();
    for (const m of unreadMessages || []) {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    }

    const enriched = (conversations || []).map((c) => {
      const otherId = c.participant_one === userId ? c.participant_two : c.participant_one;
      return {
        ...c,
        otherUser: userMap.get(otherId) || null,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    return res.json({ conversations: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post("/conversations", async (req, res, next) => {
  try {
    const userId = req.profile.id;
    const recipientId = req.body.recipientId;

    if (!isValidUuid(recipientId) || recipientId === userId) {
      return res.status(400).json({ error: "Valid recipient user ID is required." });
    }

    const { data: recipient } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("id", recipientId)
      .maybeSingle();

    if (!recipient) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    const [p1, p2] = [userId, recipientId].sort();
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .or(`and(participant_one.eq.${p1},participant_two.eq.${p2}),and(participant_one.eq.${p2},participant_two.eq.${p1})`)
      .maybeSingle();

    if (existing) {
      return res.json({ conversation: { ...existing, otherUser: recipient } });
    }

    const { data: created, error } = await supabaseAdmin
      .from("conversations")
      .insert({ participant_one: p1, participant_two: p2 })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ conversation: { ...created, otherUser: recipient } });
  } catch (err) {
    return next(err);
  }
});

router.get("/conversations/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const userId = req.profile.id;

    const { data: conversation, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (convErr) throw convErr;
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.participant_one !== userId && conversation.participant_two !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    // Mark incoming messages as read
    await supabaseAdmin
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    return res.json({ conversation, messages: messages || [] });
  } catch (err) {
    return next(err);
  }
});

router.post("/conversations/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const userId = req.profile.id;
    const content = sanitizeText(req.body.content, 2000);
    if (!content) {
      return res.status(400).json({ error: "Message content cannot be empty." });
    }

    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.participant_one !== userId && conversation.participant_two !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const receiverId =
      conversation.participant_one === userId ? conversation.participant_two : conversation.participant_one;

    const { data: message, error: msgErr } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_text: content.slice(0, 140),
        last_message_at: message.created_at,
      })
      .eq("id", conversation.id);

    await createNotification({
      userId: receiverId,
      type: "new_message",
      title: `Message from ${req.profile.full_name}`,
      message: content.slice(0, 100),
      link: req.profile.role === "student" ? "/alumni/messages" : "/student/messages",
      metadata: { conversationId: conversation.id },
    });

    return res.status(201).json({ message });
  } catch (err) {
    return next(err);
  }
});

router.patch("/conversations/:id/read", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    await supabaseAdmin
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", req.params.id)
      .eq("receiver_id", req.profile.id)
      .eq("is_read", false);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
