import { useEffect, useState } from "react";
import { CheckCircle2, EyeOff, Pin, Trash2 } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  DataTable,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

export default function AdminModerationPage() {
  const { showToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/posts");
      setPosts(res.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updatePost = async (id, patch) => {
    try {
      const res = await api.patch(`/admin/posts/${id}`, patch);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...res.post } : p)));
      showToast("Post updated.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deletePost = async (id) => {
    try {
      await api.delete(`/community/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      showToast("Post deleted.", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const columns = [
    {
      key: "author",
      label: "Author",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.author?.full_name || "Member"}</p>
          <p className="text-xs text-slate-500 capitalize">{p.author?.role}</p>
        </div>
      ),
    },
    {
      key: "content",
      label: "Post",
      render: (p) => (
        <div className="max-w-md">
          {p.title && <p className="font-semibold text-slate-900 text-xs">{p.title}</p>}
          <p className="text-xs text-slate-600 line-clamp-2">{p.content}</p>
        </div>
      ),
    },
    {
      key: "post_type",
      label: "Category",
      render: (p) => <span className="text-xs capitalize">{p.post_type.replace("_", " ")}</span>,
    },
    {
      key: "is_approved",
      label: "Visibility",
      render: (p) => <StatusBadge status={p.is_approved ? "active" : "rejected"} />,
    },
    {
      key: "actions",
      label: "Moderation",
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updatePost(p.id, { is_approved: !p.is_approved })}
            title={p.is_approved ? "Hide Post" : "Approve Post"}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            {p.is_approved ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </button>
          <button
            type="button"
            onClick={() => updatePost(p.id, { is_pinned: !p.is_pinned })}
            title={p.is_pinned ? "Unpin Post" : "Pin Post"}
            className={`p-1.5 rounded-lg ${
              p.is_pinned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => deletePost(p.id)}
            title="Delete Post"
            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community Post Moderation"
        subtitle="Pin institutional announcements, hide inappropriate content, or remove posts."
      />
      <ErrorBanner message={error} onRetry={loadPosts} />
      {loading ? <LoadingSpinner label="Loading community posts..." /> : <DataTable columns={columns} rows={posts} />}
    </div>
  );
}
