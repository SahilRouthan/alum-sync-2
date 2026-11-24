import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  DataTable,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

export default function AdminStudentsPage() {
  const { profile: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users");
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      showToast("User role updated.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleActive = async (user) => {
    try {
      const next = !user.is_active;
      await api.patch(`/admin/users/${user.id}/role`, { is_active: next });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)));
      showToast(next ? "Account activated." : "Account deactivated.", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      key: "full_name",
      label: "User",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900">{u.full_name || "Unnamed"}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (u) => (
        <select
          value={u.role}
          disabled={u.id === currentAdmin?.id}
          onChange={(e) => updateRole(u.id, e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold capitalize disabled:bg-slate-100"
        >
          <option value="student">student</option>
          <option value="alumni">alumni</option>
          <option value="admin">admin</option>
        </select>
      ),
    },
    {
      key: "is_active",
      label: "Account Status",
      render: (u) => <StatusBadge status={u.is_active ? "active" : "cancelled"} />,
    },
    {
      key: "created_at",
      label: "Joined",
      render: (u) => <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      label: "Access",
      render: (u) => (
        <button
          type="button"
          disabled={u.id === currentAdmin?.id}
          onClick={() => toggleActive(u)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {u.is_active ? "Deactivate" : "Activate"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students, Users & Role Permissions"
        subtitle="Manage registered students, alumni, and administrator roles across the platform."
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "student", "alumni", "admin"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                roleFilter === r ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or email..."
            className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>

      <ErrorBanner message={error} onRetry={loadUsers} />
      {loading ? <LoadingSpinner label="Loading user directory..." /> : <DataTable columns={columns} rows={filtered} />}
    </div>
  );
}
