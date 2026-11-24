import { useEffect, useState } from "react";
import { Briefcase, Building2, ExternalLink, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
  SkillTagInput,
} from "../../components/app/UI";

export default function JobsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const canPost = ["alumni", "admin"].includes(profile?.role);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("all");
  const [workMode, setWorkMode] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "full_time",
    work_mode: "hybrid",
    industry: "",
    salary_range: "",
    application_url: "",
    description: "",
    required_skills: [],
  });

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (jobType !== "all") params.set("job_type", jobType);
      if (workMode !== "all") params.set("work_mode", workMode);
      const res = await api.get(`/jobs?${params.toString()}`);
      setJobs(res.jobs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [jobType, workMode]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/jobs", form);
      setJobs((prev) => [res.job, ...prev]);
      setModalOpen(false);
      setForm({
        title: "",
        company: "",
        location: "",
        job_type: "full_time",
        work_mode: "hybrid",
        industry: "",
        salary_range: "",
        application_url: "",
        description: "",
        required_skills: [],
      });
      showToast("Opportunity published!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      showToast("Opportunity removed.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Career Opportunities & Job Board"
        subtitle="Explore verified jobs, internships, and referrals shared directly by alumni."
        actions={
          canPost && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Post Opportunity
            </button>
          )
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadJobs()}
            placeholder="Search role, company, or skill..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
        >
          <option value="all">All Types</option>
          <option value="full_time">Full-Time</option>
          <option value="internship">Internship</option>
          <option value="referral">Referral</option>
          <option value="contract">Contract</option>
        </select>
        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
        >
          <option value="all">All Modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        <button
          type="button"
          onClick={loadJobs}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
        >
          Filter
        </button>
      </div>

      <ErrorBanner message={error} onRetry={loadJobs} />

      {loading ? (
        <LoadingSpinner label="Loading opportunities..." />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No open opportunities match your filters"
          description="Try broadening your search filters or check back as alumni post new roles."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold capitalize">
                      {job.job_type.replace("_", " ")} • {job.work_mode}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{job.title}</h3>
                  </div>
                  {(job.posted_by === profile?.id || profile?.role === "admin") && (
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Building2 className="w-3.5 h-3.5" /> {job.company}
                  </span>
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </span>
                  )}
                  {job.salary_range && (
                    <span className="text-emerald-700 font-semibold">{job.salary_range}</span>
                  )}
                </div>

                <p className="text-sm text-slate-600 mt-3 line-clamp-3 leading-relaxed">{job.description}</p>

                {job.required_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.required_skills.map((s) => (
                      <span key={s} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  Posted by {job.poster?.full_name || "Alumni"}
                </span>
                {job.application_url && (
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 no-underline"
                  >
                    Apply Now <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Job or Internship">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Software Engineer Intern"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Type</label>
              <select
                value={form.job_type}
                onChange={(e) => setForm({ ...form, job_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              >
                <option value="full_time">Full-Time</option>
                <option value="internship">Internship</option>
                <option value="referral">Referral</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
              <select
                value={form.work_mode}
                onChange={(e) => setForm({ ...form, work_mode: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              >
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Bengaluru / Remote"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Compensation / Stipend</label>
              <input
                type="text"
                value={form.salary_range}
                onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                placeholder="e.g. ₹40k/mo or 12-18 LPA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Application URL</label>
              <input
                type="url"
                value={form.application_url}
                onChange={(e) => setForm({ ...form, application_url: e.target.value })}
                placeholder="https://careers.company.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Required Skills</label>
            <SkillTagInput
              value={form.required_skills}
              onChange={(skills) => setForm({ ...form, required_skills: skills })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              {saving ? "Publishing..." : "Publish Job"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
