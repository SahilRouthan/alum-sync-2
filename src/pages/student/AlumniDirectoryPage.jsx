import { useEffect, useState } from "react";
import { Building2, ExternalLink, GraduationCap, MapPin, Search, Users, BadgeCheck } from "lucide-react";
import { api } from "../../services/apiClient";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
} from "../../components/app/UI";
import MentorshipRequestModal from "../../components/app/MentorshipRequestModal";

export default function AlumniDirectoryPage() {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    company: "",
    industry: "",
    job_role: "",
    skill: "",
    graduation_year: "",
    location: "",
    available: false,
  });

  const [detailAlumnus, setDetailAlumnus] = useState(null);
  const [requestAlumnus, setRequestAlumnus] = useState(null);

  const loadDirectory = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== false) params.set(k, String(v));
      });
      const res = await api.get(`/alumni?${params.toString()}`);
      setAlumni(res.alumni || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadDirectory();
  };

  return (
    <div>
      <PageHeader
        title="Verified Alumni Directory"
        subtitle="Discover alumni across companies, industries, graduation years, and locations."
      />

      <form
        onSubmit={handleFilterSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Name, keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <input
            type="text"
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            placeholder="Company (e.g. Google)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            placeholder="Industry (e.g. FinTech)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={filters.job_role}
            onChange={(e) => setFilters({ ...filters, job_role: e.target.value })}
            placeholder="Job Role (e.g. SDE)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={filters.skill}
            onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
            placeholder="Skill (e.g. React, Python)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="number"
            value={filters.graduation_year}
            onChange={(e) => setFilters({ ...filters, graduation_year: e.target.value })}
            placeholder="Graduation Year (e.g. 2021)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            placeholder="Location (e.g. Bengaluru)"
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.available}
                onChange={(e) => setFilters({ ...filters, available: e.target.checked })}
              />
              Mentors only
            </label>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      <ErrorBanner message={error} onRetry={loadDirectory} />

      {loading ? (
        <LoadingSpinner label="Searching alumni directory..." />
      ) : alumni.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No verified alumni found"
          description="No alumni matched your filter criteria. Try clearing some filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alumni.map((alumnus) => (
            <div
              key={alumnus.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  <Avatar name={alumnus.full_name} src={alumnus.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-slate-900 truncate">{alumnus.full_name}</h3>
                      <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-xs font-medium text-slate-600 truncate">
                      {alumnus.job_title || "Alumni Member"}
                    </p>
                    {alumnus.company && (
                      <p className="text-xs text-brand-700 font-semibold flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" /> {alumnus.company}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  {(alumnus.graduation_year || alumnus.department) && (
                    <p className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {[alumnus.degree, alumnus.department, alumnus.graduation_year ? `Batch ${alumnus.graduation_year}` : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                  {alumnus.location && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {alumnus.location}
                    </p>
                  )}
                </div>

                {alumnus.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {alumnus.skills.slice(0, 5).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailAlumnus(alumnus)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Profile
                </button>
                {alumnus.is_available_for_mentorship && (
                  <button
                    type="button"
                    onClick={() => setRequestAlumnus(alumnus)}
                    className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                  >
                    Request Mentor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(detailAlumnus)}
        onClose={() => setDetailAlumnus(null)}
        title={detailAlumnus?.full_name || "Alumni Profile"}
        maxWidth="max-w-2xl"
      >
        {detailAlumnus && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar name={detailAlumnus.full_name} src={detailAlumnus.avatar_url} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detailAlumnus.full_name}</h3>
                <p className="text-sm text-slate-600">
                  {[detailAlumnus.job_title, detailAlumnus.company].filter(Boolean).join(" at ")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {[detailAlumnus.industry, detailAlumnus.location, detailAlumnus.years_of_experience ? `${detailAlumnus.years_of_experience} yrs exp` : null]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {detailAlumnus.linkedin_url && (
                  <a
                    href={detailAlumnus.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 mt-2 no-underline"
                  >
                    LinkedIn Profile <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {detailAlumnus.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">About</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{detailAlumnus.bio}</p>
              </div>
            )}

            {detailAlumnus.skills?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {detailAlumnus.skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailAlumnus.mentorship_topics?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mentorship Topics</h4>
                <div className="flex flex-wrap gap-1.5">
                  {detailAlumnus.mentorship_topics.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailAlumnus(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              {detailAlumnus.is_available_for_mentorship && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailAlumnus;
                    setDetailAlumnus(null);
                    setRequestAlumnus(target);
                  }}
                  className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                >
                  Request Mentorship
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <MentorshipRequestModal
        alumnus={requestAlumnus}
        open={Boolean(requestAlumnus)}
        onClose={() => setRequestAlumnus(null)}
      />
    </div>
  );
}
