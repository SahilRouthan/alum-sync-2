import { useContext, useMemo, useState } from "react";
import { UserContext } from "../../context/UserContext";
import { useToast } from "../../../context/ToastContext";

const HomeFeed = () => {
  const { userData, posts, createFeedPost, togglePostLike, searchQuery } = useContext(UserContext);
  const { showToast } = useToast();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) =>
      [p.author, p.role, p.batch, p.content].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  const handleCreatePost = async (e) => {
    e?.preventDefault?.();
    if (!draft.trim()) {
      showToast("Write something to share with your AlumSync network.", "info");
      return;
    }
    setSubmitting(true);
    try {
      await createFeedPost(draft);
      setDraft("");
      showToast("Update published to the community!", "success");
    } catch (err) {
      showToast(err.message || "Could not publish post.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Share Box */}
      <form onSubmit={handleCreatePost} className="as-card p-5">
        <div className="flex gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-primary-soft font-bold border border-border-strong">
            {userData?.avatar || "AS"}
          </div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update or achievement..."
            className="w-full bg-input-bg border border-transparent focus:border-primary rounded-full px-5 text-sm text-text-main placeholder:text-text-muted focus:ring-4 focus:ring-primary/10 outline-none transition-all"
          />
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-subtle">
          <div className="flex gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => showToast("Attach media in Community & Profile modules.", "info")}
              className="text-xs font-semibold text-text-muted flex items-center gap-2 hover:text-primary-violet transition-colors p-1 rounded-md hover:bg-hover-bg"
            >
              📷 Photo
            </button>
            <button
              type="button"
              onClick={() => showToast("Video posts coming soon.", "info")}
              className="text-xs font-semibold text-text-muted flex items-center gap-2 hover:text-primary-violet transition-colors p-1 rounded-md hover:bg-hover-bg"
            >
              🎥 Video
            </button>
            <button
              type="button"
              onClick={() => showToast("Share career insights right from the composer!", "info")}
              className="hidden sm:flex text-xs font-semibold text-text-muted items-center gap-2 hover:text-primary-violet transition-colors p-1 rounded-md hover:bg-hover-bg"
            >
              📄 Article
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary py-1.5 px-6 text-sm shadow-glow disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>

      {/* Post List */}
      {filteredPosts.length === 0 ? (
        <div className="as-card p-8 text-center text-sm text-text-muted">
          No updates match your search yet.
        </div>
      ) : (
        filteredPosts.map((post) => (
          <div key={post.id} className="as-card p-5">
            <div className="flex justify-between items-start mb-4 gap-3">
              <div className="flex gap-3 cursor-pointer group min-w-0">
                <div className="w-12 h-12 rounded-full bg-input-bg flex items-center justify-center text-text-muted font-bold border border-border-subtle group-hover:border-primary-violet transition-colors shrink-0">
                  {String(post.author || "A").charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm flex items-center gap-1.5 flex-wrap group-hover:text-primary-violet transition-colors">
                    <span className="truncate">{post.author}</span>
                    <span className="text-[10px] bg-accent text-primary-soft px-1.5 py-0.5 rounded-md shrink-0">
                      ✓ Verified
                    </span>
                  </h4>
                  <p className="text-[11px] text-text-muted truncate">
                    {post.role} • {post.batch}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-text-muted font-medium shrink-0">{post.timestamp}</span>
            </div>

            <p className="text-sm text-text-main leading-relaxed mb-2">{post.content}</p>

            <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => togglePostLike(post.id)}
                className={`text-xs font-bold flex items-center gap-1.5 transition-all active:scale-90 ${
                  post.likedByMe ? "text-primary-violet" : "text-text-muted hover:text-primary-violet"
                }`}
              >
                ❤️ {post.likes}
              </button>
              <button
                type="button"
                onClick={() => showToast(`Comments on ${post.author}'s post`, "info")}
                className="text-xs font-bold text-text-muted hover:text-primary-violet flex items-center gap-1.5 transition-all"
              >
                💬 {post.comments}
              </button>
              <button
                type="button"
                onClick={() => showToast(`Shared ${post.author}'s update`, "success")}
                className="text-xs font-bold text-text-muted hover:text-primary-violet flex items-center gap-1.5 transition-all"
              >
                🔄 Repost
              </button>
              <button
                type="button"
                onClick={() => showToast("Saved to your bookmarks!", "success")}
                className="text-xs font-bold text-text-muted hover:text-primary-violet ml-auto transition-all active:scale-90"
              >
                🔖 Save
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default HomeFeed;
