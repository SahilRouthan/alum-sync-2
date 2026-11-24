import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", req.profile.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({
      notifications: data || [],
      unreadCount: (data || []).filter((n) => !n.is_read).length,
    });
  } catch (err) {
    return next(err);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.profile.id)
      .eq("is_read", false);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid notification ID." });
    }
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("user_id", req.profile.id);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
