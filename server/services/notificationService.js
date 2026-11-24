import { supabaseAdmin } from "../config/supabase.js";

export async function createNotification({ userId, type, title, message, link = null, metadata = {} }) {
  if (!userId || !supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.warn("Notification insert warning:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Notification error:", err.message);
    return null;
  }
}
