import { useEffect, useState } from "react";
import { Heart, MessageCircle, Pin, Plus, Search, Send, Trash2 } from "lucide-react";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
  SkillTagInput,
} from "../../components/app/UI";

const POST_TYPES = [
  { value: "all", label: "All Posts" },
  { value: "career_advice", label: "Career Advice" },
  { value: "achievement", label: "Achievements" },
  { value: "career_update", label: "Career Updates" },
  { value: "announcement", label: "Announcements" },
  { value: "discussion", label: "Discussions" },
];

export default function CommunityPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    post_type: profile?.role === "alumni" ? "career_advice" : "discussion",
    tags: [],
  });

  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentInput, setCommentInput] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("post_type", filterType);
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`/community/posts?${params.toString()}`);
      setPosts(res.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [filterType]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/community/posts", form);
      setPosts((prev) => [res.post, ...prev]);
      setCreateOpen(false);
      setForm({ title: "", content: "", post_type: "discussion", tags: [] });
      showToast("Post published!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const toggleLike = async (postId) => {
    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likedByMe: res.liked, likes_count: res.likes_count } : p
        )
      );
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleComments = async (postId) => {
    if (openCommentsId === postId) {
      setOpenCommentsId(null);
      return;
    }
    setOpenCommentsId(postId);
    if (!commentsByPost[postId]) {
      try {
        const res = await api.get(`/community/posts/${postId}/comments`);
        setCommentsByPost((prev) => ({ ...prev, [postId]: res.comments || [] }));
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  };

  const submitComment = async (postId) => {
    if (!commentInput.trim()) return;
    try {
      const res = await api.post(`/community/posts/${postId}/comments`, { content: commentInput });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.comment],
      }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
      );
      setCommentInput("");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("Post removed.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Community & Announcements"
        subtitle="Share career advice, milestones, and institutional updates with students and alumni."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === t.value
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPosts()}
              placeholder="Search posts..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={loadPosts}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            Search
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={loadPosts} />

      {loading ? (
        <LoadingSpinner label="Loading community feed..." />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No community posts yet"
          description="Be the first to share career advice, an achievement, or start a discussion."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={post.author?.full_name || "Member"} src={post.author?.avatar_url} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {post.author?.full_name || "Community Member"}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {post.author?.role || "member"}
                      </span>
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(post.created_at).toLocaleString()} •{" "}
                      <span className="capitalize">{post.post_type.replace("_", " ")}</span>
                    </p>
                  </div>
                </div>

                {(post.author_id === profile?.id || profile?.role === "admin") && (
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {post.title && <h3 className="text-base font-bold text-slate-900 mt-4">{post.title}</h3>}
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-line leading-relaxed">{post.content}</p>

              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    post.likedByMe
                      ? "bg-rose-50 text-rose-600"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-current" : ""}`} />
                  {post.likes_count || 0} Likes
                </button>
                <button
                  type="button"
                  onClick={() => toggleComments(post.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  {post.comments_count || 0} Comments
                </button>
              </div>

              {openCommentsId === post.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {(commentsByPost[post.id] || []).map((c) => (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-900">{c.author?.full_name || "User"}</span>
                        <span className="text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700">{c.content}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => submitComment(post.id)}
                      className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 inline-flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Community Post">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={form.post_type}
              onChange={(e) => setForm({ ...form, post_type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            >
              {POST_TYPES.filter((t) => t.value !== "all").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your post a headline"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
            <textarea
              required
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Share advice, milestones, or questions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags</label>
            <SkillTagInput
              value={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              placeholder="Add tag (e.g. Career, React)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              {creating ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
