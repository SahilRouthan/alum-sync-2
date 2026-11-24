import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeText } from "../utils/normalize.js";
import { isValidUrl, isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const statusFilter = sanitizeText(req.query.status, 30);
    let query = supabaseAdmin.from("events").select("*").order("event_date", { ascending: true });
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    const eventIds = (events || []).map((e) => e.id);
    const organizerIds = [...new Set((events || []).map((e) => e.organizer_id))];

    const [{ data: registrations }, { data: organizers }] = await Promise.all([
      eventIds.length > 0
        ? supabaseAdmin.from("event_registrations").select("event_id, user_id, status").in("event_id", eventIds)
        : Promise.resolve({ data: [] }),
      organizerIds.length > 0
        ? supabaseAdmin.from("profiles").select("id, full_name, role").in("id", organizerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const regCounts = new Map();
    const myRegs = new Set();
    for (const r of registrations || []) {
      if (r.status !== "cancelled") {
        regCounts.set(r.event_id, (regCounts.get(r.event_id) || 0) + 1);
      }
      if (r.user_id === req.profile.id && r.status !== "cancelled") {
        myRegs.add(r.event_id);
      }
    }

    const orgMap = new Map((organizers || []).map((o) => [o.id, o]));

    const enriched = (events || []).map((ev) => ({
      ...ev,
      organizer: orgMap.get(ev.organizer_id) || null,
      registrationsCount: regCounts.get(ev.id) || 0,
      isRegistered: myRegs.has(ev.id),
    }));

    return res.json({ events: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireRole("alumni", "admin"), async (req, res, next) => {
  try {
    const title = sanitizeText(req.body.title, 180);
    const description = sanitizeText(req.body.description, 3000);
    const eventType = sanitizeText(req.body.event_type || "webinar", 40);
    const location = sanitizeText(req.body.location, 200) || null;
    const isVirtual = Boolean(req.body.is_virtual);
    const meetingLink = sanitizeText(req.body.meeting_link, 300) || null;
    const eventDate = req.body.event_date;
    const endDate = req.body.end_date || null;
    const maxAttendees = req.body.max_attendees ? Number(req.body.max_attendees) : null;

    if (!title || !description || !eventDate) {
      return res.status(400).json({ error: "Title, description, and event date are required." });
    }
    if (meetingLink && !isValidUrl(meetingLink)) {
      return res.status(400).json({ error: "Invalid meeting link URL." });
    }

    const { data: created, error } = await supabaseAdmin
      .from("events")
      .insert({
        organizer_id: req.profile.id,
        title,
        description,
        event_type: eventType,
        location,
        is_virtual: isVirtual,
        meeting_link: meetingLink,
        event_date: new Date(eventDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        max_attendees: maxAttendees,
        status: "upcoming",
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ event: { ...created, registrationsCount: 0, isRegistered: false } });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/register", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid event ID." });
    }
    const { data: ev } = await supabaseAdmin.from("events").select("*").eq("id", req.params.id).maybeSingle();
    if (!ev) return res.status(404).json({ error: "Event not found." });

    if (ev.max_attendees) {
      const { count } = await supabaseAdmin
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", ev.id)
        .neq("status", "cancelled");

      if ((count || 0) >= ev.max_attendees) {
        return res.status(400).json({ error: "This event has reached maximum capacity." });
      }
    }

    const { data: reg, error } = await supabaseAdmin
      .from("event_registrations")
      .upsert({ event_id: ev.id, user_id: req.profile.id, status: "registered" }, { onConflict: "event_id,user_id" })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ registration: reg });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id/register", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid event ID." });
    }
    await supabaseAdmin
      .from("event_registrations")
      .delete()
      .eq("event_id", req.params.id)
      .eq("user_id", req.profile.id);

    return res.json({ message: "Registration cancelled." });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireRole("alumni", "admin"), async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid event ID." });
    }
    const { data: ev } = await supabaseAdmin.from("events").select("id, organizer_id").eq("id", req.params.id).maybeSingle();
    if (!ev) return res.status(404).json({ error: "Event not found." });
    if (ev.organizer_id !== req.profile.id && req.profile.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this event." });
    }
    await supabaseAdmin.from("events").delete().eq("id", ev.id);
    return res.json({ message: "Event deleted." });
  } catch (err) {
    return next(err);
  }
});

export default router;
