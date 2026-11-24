import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeSkillsList, sanitizeText } from "../utils/normalize.js";
import { isValidUuid } from "../utils/validation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/posts", async (req, res, next) => {
  try {
    const postType = sanitizeText(req.query.post_type, 50);
    const search = sanitizeText(req.query.search, 120).toLowerCase();

    let query = supabaseAdmin
      .from("community_posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (req.profile.role !== "admin") {
      query = query.or(`is_approved.eq.true,author_id.eq.${req.profile.id}`);
    }
    if (postType && postType !== "all") {
      query = query.eq("post_type", postType);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const authorIds = [...new Set((posts || []).map((p) => p.author_id))];
    const postIds = (posts || []).map((p) => p.id);

    const [{ data: authors }, { data: myLikes }] = await Promise.all([
      authorIds.length > 0
        ? supabaseAdmin.from("profiles").select("id, full_name, role, avatar_url").in("id", authorIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabaseAdmin.from("post_likes").select("post_id").eq("user_id", req.profile.id).in("post_id", postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const authorMap = new Map((authors || []).map((a) => [a.id, a]));
    const likedSet = new Set((myLikes || []).map((l) => l.post_id));

    const enriched = (posts || [])
      .map((p) => ({
        ...p,
        author: authorMap.get(p.author_id) || null,
        likedByMe: likedSet.has(p.id),
      }))
      .filter((p) => {
        if (!search) return true;
        return (
          (p.title || "").toLowerCase().includes(search) ||
          (p.content || "").toLowerCase().includes(search) ||
          (p.author?.full_name || "").toLowerCase().includes(search) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(search))
        );
      });

    return res.json({ posts: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post("/posts", async (req, res, next) => {
  try {
    const title = sanitizeText(req.body.title, 180) || null;
    const content = sanitizeText(req.body.content, 4000);
    const postType = sanitizeText(req.body.post_type || "discussion", 40);
    const tags = normalizeSkillsList(req.body.tags || []);

    if (!content || content.length < 5) {
      return res.status(400).json({ error: "Post content must be at least 5 characters." });
    }

    const allowedTypes = ["career_advice", "achievement", "career_update", "announcement", "discussion"];
    if (!allowedTypes.includes(postType)) {
      return res.status(400).json({ error: "Invalid post_type." });
    }

    const { data: created, error } = await supabaseAdmin
      .from("community_posts")
      .insert({
        author_id: req.profile.id,
        title,
        content,
        post_type: postType,
        tags,
        is_approved: true,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({
      post: {
        ...created,
        author: {
          id: req.profile.id,
          full_name: req.profile.full_name,
          role: req.profile.role,
          avatar_url: req.profile.avatar_url,
        },
        likedByMe: false,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/posts/:id/like", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    const postId = req.params.id;
    const userId = req.profile.id;

    const { data: existing } = await supabaseAdmin
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    let liked = false;
    if (existing) {
      await supabaseAdmin.from("post_likes").delete().eq("id", existing.id);
      liked = false;
    } else {
      await supabaseAdmin.from("post_likes").insert({ post_id: postId, user_id: userId });
      liked = true;
    }

    const { data: post } = await supabaseAdmin
      .from("community_posts")
      .select("likes_count")
      .eq("id", postId)
      .single();

    return res.json({ liked, likes_count: post?.likes_count ?? 0 });
  } catch (err) {
    return next(err);
  }
});

router.get("/posts/:id/comments", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    const { data: comments, error } = await supabaseAdmin
      .from("post_comments")
      .select("*")
      .eq("post_id", req.params.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const authorIds = [...new Set((comments || []).map((c) => c.author_id))];
    const { data: authors } =
      authorIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name, role, avatar_url").in("id", authorIds)
        : { data: [] };

    const authorMap = new Map((authors || []).map((a) => [a.id, a]));
    return res.json({
      comments: (comments || []).map((c) => ({ ...c, author: authorMap.get(c.author_id) || null })),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/posts/:id/comments", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    const content = sanitizeText(req.body.content, 1500);
    if (!content) {
      return res.status(400).json({ error: "Comment cannot be empty." });
    }

    const { data: created, error } = await supabaseAdmin
      .from("post_comments")
      .insert({
        post_id: req.params.id,
        author_id: req.profile.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({
      comment: {
        ...created,
        author: {
          id: req.profile.id,
          full_name: req.profile.full_name,
          role: req.profile.role,
          avatar_url: req.profile.avatar_url,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    const { data: existing } = await supabaseAdmin
      .from("community_posts")
      .select("id, author_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: "Post not found." });
    if (existing.author_id !== req.profile.id && req.profile.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this post." });
    }

    await supabaseAdmin.from("community_posts").delete().eq("id", existing.id);
    return res.json({ message: "Post deleted." });
  } catch (err) {
    return next(err);
  }
});

export default router;
