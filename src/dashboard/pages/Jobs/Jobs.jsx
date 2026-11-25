import { useContext, useMemo } from "react";
import { UserContext } from "../../context/UserContext";
import { useToast } from "../../../context/ToastContext";

const tagStyles = {
  type: "bg-success/10 text-success",
  mode: "bg-cyan/10 text-cyan",
  salary: "bg-warning/10 text-warning",
};

const Jobs = () => {
  const { jobs, jobStats, loading, searchQuery } = useContext(UserContext);
  const { showToast } = useToast();

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      [job.title, job.company, job.location, job.jobType, job.description, job.postedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [jobs, searchQuery]);

  const handleApply = (job) => {
    if (job.application_url) {
      window.open(job.application_url, "_blank", "noopener,noreferrer");
    } else {
      showToast(`Application interest noted for ${job.title} at ${job.company}!`, "success");
    }
  };

  const stats = [
    { num: jobStats?.activeListings ?? filteredJobs.length, label: "Active Listings", chg: "↑ 12 new today", up: true },
    { num: jobStats?.companies ? `${jobStats.companies}+` : "—", label: "Companies", chg: "FAANG + Startups", up: true },
    { num: jobStats?.referralsGiven ?? "—", label: "Referrals Given", chg: "This month", up: true },
    { num: jobStats?.myApplications ?? "—", label: "Your Applications", chg: "2 under review", up: false },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 md:h-[calc(100vh-70px)] md:overflow-y-auto no-scrollbar">
      <h1 className="font-sora text-2xl font-bold text-text-main">Jobs & Internships</h1>
      <p className="text-sm text-text-muted mt-1 mb-6">
        Opportunities posted directly by verified AlumSync alumni — get referrals instantly
      </p>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="as-card p-4">
            <div className="font-sora text-2xl font-extrabold text-accent-violet">{s.num}</div>
            <div className="text-xs text-text-muted mt-1">{s.label}</div>
            <div className={`text-[11px] mt-1 font-semibold ${s.up ? "text-success" : "text-destructive"}`}>
              {s.chg}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="as-card p-10 text-center text-text-muted text-sm">Loading listings...</div>
      )}

      {!loading && filteredJobs?.length === 0 && (
        <div className="as-card p-10 text-center text-text-muted text-sm">
          No job listings yet — check back soon.
        </div>
      )}

      {!loading && filteredJobs?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="as-card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-input-bg flex items-center justify-center text-xl flex-shrink-0">
                  {job.icon || "💼"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-text-main">{job.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {job.company} · {job.location} · {job.jobType}
                  </p>
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed mt-3">{job.description}</p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {(job.tags || []).map((tag, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-semibold px-2 py-1 rounded ${tagStyles[tag.type] || tagStyles.type}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => handleApply(job)}
                  className="btn-primary py-1.5 px-4 text-xs"
                >
                  Quick Apply →
                </button>
                <button
                  type="button"
                  onClick={() => showToast(`Saved "${job.title}" to your list!`, "success")}
                  className="text-xs font-semibold text-text-muted border border-border-subtle rounded-lg px-3 py-1.5 hover:bg-hover-bg hover:text-text-main transition-all"
                >
                  🔖 Save
                </button>
                <span className="text-[11px] text-text-muted ml-auto">Posted by {job.postedBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;
