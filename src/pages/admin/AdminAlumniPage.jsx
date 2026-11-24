import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Edit3, Plus, Search, Trash2, XCircle } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  DataTable,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
  SkillTagInput,
  StatusBadge,
} from "../../components/app/UI";

export default function AdminAlumniPage() {
  const { showToast } = useToast();
  const [alumni, setAlumni] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    job_title: "",
    industry: "",
    degree: "",
    department: "",
    graduation_year: "",
    location: "",
    skills: [],
  });

  const loadAlumni = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const [alumRes, dupRes] = await Promise.all([
        api.get(`/admin/alumni?${params.toString()}`),
        api.get("/admin/alumni/duplicates"),
      ]);
      setAlumni(alumRes.alumni || []);
      setDuplicates(dupRes.duplicateGroups || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlumni();
  }, [statusFilter]);

  const handleVerify = async (id, status) => {
    try {
      await api.patch(`/admin/alumni/${id}/verify`, { status });
      showToast(`Alumni marked as ${status}.`, "success");
      loadAlumni();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this alumni record?")) return;
    try {
      await api.delete(`/admin/alumni/${id}`);
      showToast("Alumni record deleted.", "info");
      loadAlumni();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const openCreateModal = () => {
    setForm({
      full_name: "",
      email: "",
      company: "",
      job_title: "",
      industry: "",
      degree: "",
      department: "",
      graduation_year: "",
      location: "",
      skills: [],
    });
    setEditModal({ mode: "create" });
  };

  const openEditModal = (row) => {
    setForm({
      full_name: row.full_name || "",
      email: row.email || "",
      company: row.company || "",
      job_title: row.job_title || "",
      industry: row.industry || "",
      degree: row.degree || "",
      department: row.department || "",
      graduation_year: row.graduation_year || "",
      location: row.location || "",
      skills: row.skills || [],
    });
    setEditModal({ mode: "edit", id: row.id });
  };

  const saveModal = async (e) => {
    e.preventDefault();
    try {
      if (editModal.mode === "create") {
        await api.post("/admin/alumni", form);
        showToast("Alumni record created.", "success");
      } else {
        await api.patch(`/admin/alumni/${editModal.id}`, form);
        showToast("Alumni record updated.", "success");
      }
      setEditModal(null);
      loadAlumni();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const columns = [
    {
      key: "full_name",
      label: "Alumnus",
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.full_name}</p>
          <p className="text-xs text-slate-500">{r.email}</p>
        </div>
      ),
    },
    {
      key: "company",
      label: "Role & Company",
      render: (r) => (
        <div>
          <p className="text-slate-900 font-medium">{r.job_title || "—"}</p>
          <p className="text-xs text-slate-500">{[r.company, r.industry].filter(Boolean).join(" • ")}</p>
        </div>
      ),
    },
    {
      key: "graduation_year",
      label: "Batch",
      render: (r) => <span>{[r.degree, r.graduation_year].filter(Boolean).join(" • ") || "—"}</span>,
    },
    {
      key: "verification_status",
      label: "Status",
      render: (r) => <StatusBadge status={r.verification_status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {!r.is_verified && (
            <button
              type="button"
              onClick={() => handleVerify(r.id, "verified")}
              title="Approve & Verify"
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {r.is_verified && (
            <button
              type="button"
              onClick={() => handleVerify(r.id, "rejected")}
              title="Revoke Verification"
              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openEditModal(r)}
            title="Edit Record"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r.id)}
            title="Delete Record"
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
        title="Alumni Management & Verification"
        subtitle="Verify pending profiles, edit alumni details, and inspect duplicate records."
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> Add Alumnus
          </button>
        }
      />

      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {duplicates.length} Potential Duplicate Name + Graduation Year Group(s) Detected
          </div>
          {duplicates.map((grp, idx) => (
            <div key={idx} className="text-xs text-amber-800 bg-white/70 rounded-xl p-2.5 border border-amber-200">
              {grp.map((item) => `${item.full_name} (${item.email}, Batch ${item.graduation_year || "N/A"})`).join("  |  ")}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "pending", "verified", "rejected"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                statusFilter === st ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {st}
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
              onKeyDown={(e) => e.key === "Enter" && loadAlumni()}
              placeholder="Search name, email, company..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={loadAlumni}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            Search
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={loadAlumni} />
      {loading ? <LoadingSpinner label="Loading alumni records..." /> : <DataTable columns={columns} rows={alumni} />}

      <Modal
        open={Boolean(editModal)}
        onClose={() => setEditModal(null)}
        title={editModal?.mode === "create" ? "Add Alumni Record" : "Edit Alumni Record"}
      >
        <form onSubmit={saveModal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                disabled={editModal?.mode === "edit"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
              <input
                type="number"
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Skills</label>
            <SkillTagInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
