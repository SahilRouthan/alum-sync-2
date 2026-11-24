import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createNotification } from "../services/notificationService.js";
import { sanitizeText } from "../utils/normalize.js";
import { isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.post("/requests", requireRole("student"), async (req, res, next) => {
  try {
    const alumniId = req.body.alumniId;
    const message = sanitizeText(req.body.message, 1500);
    const topic = sanitizeText(req.body.topic, 150) || "Career Mentorship";
    const goals = sanitizeText(req.body.goals, 500) || null;

    if (!isValidUuid(alumniId)) {
      return res.status(400).json({ error: "Valid alumni profile ID is required." });
    }
    if (!message || message.length < 10) {
      return res.status(400).json({ error: "Please include a personalized message (at least 10 characters)." });
    }

    const { data: alumnus, error: alumErr } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("id", alumniId)
      .maybeSingle();

    if (alumErr) throw alumErr;
    if (!alumnus || !alumnus.is_verified) {
      return res.status(404).json({ error: "Verified alumnus not found." });
    }
    if (!alumnus.is_available_for_mentorship) {
      return res.status(400).json({ error: "This alumnus is currently not accepting new mentorship requests." });
    }

    const { data: duplicatePending } = await supabaseAdmin
      .from("mentorship_requests")
      .select("id")
      .eq("student_id", req.profile.id)
      .eq("alumni_id", alumniId)
      .eq("status", "pending")
      .maybeSingle();

    if (duplicatePending) {
      return res.status(409).json({ error: "You already have a pending mentorship request with this alumnus." });
    }

    const { data: created, error: createErr } = await supabaseAdmin
      .from("mentorship_requests")
      .insert({
        student_id: req.profile.id,
        alumni_id: alumniId,
        alumni_user_id: alumnus.user_id,
        topic,
        goals,
        message,
        status: "pending",
      })
      .select()
      .single();

    if (createErr) throw createErr;

    if (alumnus.user_id) {
      await createNotification({
        userId: alumnus.user_id,
        type: "mentorship_request",
        title: "New Mentorship Request",
        message: `${req.profile.full_name} requested mentorship on "${topic}".`,
        link: "/alumni/mentorship",
        metadata: { requestId: created.id },
      });
    }

    return res.status(201).json({ request: created });
  } catch (err) {
    return next(err);
  }
});

router.get("/requests", async (req, res, next) => {
  try {
    const role = req.profile.role;
    let query = supabaseAdmin.from("mentorship_requests").select("*").order("created_at", { ascending: false });

    if (role === "student") {
      query = query.eq("student_id", req.profile.id);
    } else if (role === "alumni") {
      const { data: alum } = await supabaseAdmin
        .from("alumni_profiles")
        .select("id")
        .eq("user_id", req.profile.id)
        .maybeSingle();
      if (alum) {
        query = query.or(`alumni_user_id.eq.${req.profile.id},alumni_id.eq.${alum.id}`);
      } else {
        query = query.eq("alumni_user_id", req.profile.id);
      }
    }

    const { data: requests, error } = await query;
    if (error) throw error;

    const studentIds = [...new Set((requests || []).map((r) => r.student_id))];
    const alumniIds = [...new Set((requests || []).map((r) => r.alumni_id))];

    const [{ data: students }, { data: alumni }] = await Promise.all([
      studentIds.length > 0
        ? supabaseAdmin.from("profiles").select("id, full_name, email, avatar_url").in("id", studentIds)
        : Promise.resolve({ data: [] }),
      alumniIds.length > 0
        ? supabaseAdmin.from("alumni_profiles").select("id, user_id, full_name, company, job_title, avatar_url").in("id", alumniIds)
        : Promise.resolve({ data: [] }),
    ]);

    const studentMap = new Map((students || []).map((s) => [s.id, s]));
    const alumniMap = new Map((alumni || []).map((a) => [a.id, a]));

    const enriched = (requests || []).map((r) => ({
      ...r,
      student: studentMap.get(r.student_id) || null,
      alumni: alumniMap.get(r.alumni_id) || null,
    }));

    return res.json({ requests: enriched });
  } catch (err) {
    return next(err);
  }
});

router.patch("/requests/:id/respond", requireRole("alumni", "admin"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid request ID." });
    }
    const action = String(req.body.status || "").toLowerCase();
    const responseNote = sanitizeText(req.body.responseNote, 600) || null;
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'." });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("mentorship_requests")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: "Mentorship request not found." });

    const { data: alum } = await supabaseAdmin
      .from("alumni_profiles")
      .select("id, user_id, full_name")
      .eq("id", existing.alumni_id)
      .maybeSingle();

    const isOwner = existing.alumni_user_id === req.profile.id || alum?.user_id === req.profile.id;
    if (!isOwner && req.profile.role !== "admin") {
      return res.status(403).json({ error: "You are not authorized to respond to this request." });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("mentorship_requests")
      .update({
        status: action,
        response_note: responseNote,
        responded_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updErr) throw updErr;

    let connection = null;
    let conversation = null;

    if (action === "accepted") {
      const { data: conn } = await supabaseAdmin
        .from("mentorship_connections")
        .upsert(
          {
            request_id: existing.id,
            student_id: existing.student_id,
            alumni_id: existing.alumni_id,
            alumni_user_id: alum?.user_id || existing.alumni_user_id,
            status: "active",
          },
          { onConflict: "request_id" }
        )
        .select()
        .single();
      connection = conn;

      // Ensure a messaging conversation exists between student and alumnus if alumnus has a user account
      const alumniUserId = alum?.user_id || existing.alumni_user_id;
      if (alumniUserId && alumniUserId !== existing.student_id) {
        const [p1, p2] = [existing.student_id, alumniUserId].sort();
        const { data: existingConv } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .or(
            `and(participant_one.eq.${p1},participant_two.eq.${p2}),and(participant_one.eq.${p2},participant_two.eq.${p1})`
          )
          .maybeSingle();

        if (existingConv) {
          conversation = existingConv;
        } else {
          const { data: newConv } = await supabaseAdmin
            .from("conversations")
            .insert({
              participant_one: p1,
              participant_two: p2,
              mentorship_connection_id: conn?.id || null,
            })
            .select()
            .single();
          conversation = newConv;
        }
      }
    }

    await createNotification({
      userId: existing.student_id,
      type: "mentorship_response",
      title: action === "accepted" ? "Mentorship Request Accepted!" : "Mentorship Request Update",
      message:
        action === "accepted"
          ? `${alum?.full_name || "Your mentor"} accepted your mentorship request.`
          : `${alum?.full_name || "The alumnus"} declined your mentorship request.`,
      link: "/student/mentorship",
      metadata: { requestId: existing.id, status: action },
    });

    return res.json({ request: updated, connection, conversation });
  } catch (err) {
    return next(err);
  }
});

router.patch("/requests/:id/cancel", requireRole("student"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid request ID." });
    }
    const { data: updated, error } = await supabaseAdmin
      .from("mentorship_requests")
      .update({ status: "cancelled" })
      .eq("id", req.params.id)
      .eq("student_id", req.profile.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!updated) return res.status(404).json({ error: "Pending request not found." });

    return res.json({ request: updated });
  } catch (err) {
    return next(err);
  }
});

router.get("/connections", async (req, res, next) => {
  try {
    let query = supabaseAdmin.from("mentorship_connections").select("*").order("created_at", { ascending: false });
    if (req.profile.role === "student") {
      query = query.eq("student_id", req.profile.id);
    } else if (req.profile.role === "alumni") {
      query = query.eq("alumni_user_id", req.profile.id);
    }

    const { data: connections, error } = await query;
    if (error) throw error;

    const studentIds = [...new Set((connections || []).map((c) => c.student_id))];
    const alumniIds = [...new Set((connections || []).map((c) => c.alumni_id))];

    const [{ data: students }, { data: alumni }] = await Promise.all([
      studentIds.length > 0
        ? supabaseAdmin.from("profiles").select("id, full_name, email, avatar_url").in("id", studentIds)
        : Promise.resolve({ data: [] }),
      alumniIds.length > 0
        ? supabaseAdmin.from("alumni_profiles").select("id, user_id, full_name, company, job_title, avatar_url").in("id", alumniIds)
        : Promise.resolve({ data: [] }),
    ]);

    const studentMap = new Map((students || []).map((s) => [s.id, s]));
    const alumniMap = new Map((alumni || []).map((a) => [a.id, a]));

    const enriched = (connections || []).map((c) => ({
      ...c,
      student: studentMap.get(c.student_id) || null,
      alumni: alumniMap.get(c.alumni_id) || null,
    }));

    return res.json({ connections: enriched });
  } catch (err) {
    return next(err);
  }
});

export default router;
