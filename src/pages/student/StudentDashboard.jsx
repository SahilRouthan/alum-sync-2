import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  Handshake,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../../services/apiClient";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatCard,
} from "../../components/app/UI";
import MentorshipRequestModal from "../../components/app/MentorshipRequestModal";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/student/dashboard");
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <LoadingSpinner label="Loading your student dashboard..." />;

  const stats = data?.stats || {};
  const recommendations = data?.recommendations || [];
  const latestAnalysis = data?.latestAnalysis;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${data?.profile?.first_name || data?.profile?.full_name || "Student"}`}
        subtitle="Track your career readiness, resume insights, and top alumni mentor matches."
        actions={
          <Link
            to="/student/resume"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 no-underline"
          >
            <FileText className="w-4 h-4" /> Analyze Resume
          </Link>
        }
      />

      <ErrorBanner message={error} onRetry={loadDashboard} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Resume Readiness"
          value={stats.resumeScore !== null && stats.resumeScore !== undefined ? `${stats.resumeScore}%` : "Not uploaded"}
          subtitle={latestAnalysis?.target_role || "Upload PDF to analyze"}
          icon={FileText}
          accent="brand"
        />
        <StatCard
          title="Verified Skills"
          value={stats.skillsCount || 0}
          subtitle="From profile & resume"
          icon={Sparkles}
          accent="sky"
        />
        <StatCard
          title="Active Mentors"
          value={stats.activeConnections || 0}
          subtitle={`${stats.pendingRequests || 0} pending requests`}
          icon={Handshake}
          accent="emerald"
        />
        <StatCard
          title="Open Opportunities"
          value={stats.activeJobsCount || 0}
          subtitle={`${stats.upcomingEventsCount || 0} upcoming events`}
          icon={Briefcase}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Recommended Alumni */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">Top Recommended Mentors</h2>
              <p className="text-xs text-slate-500">
                Ranked by weighted similarity across skills, industry, role, education, and experience.
              </p>
            </div>
            <Link
              to="/student/recommendations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 no-underline shrink-0"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No mentor matches yet"
              description="Complete your profile skills or upload your resume, and ensure verified alumni exist in the network."
              action={
                <Link
                  to="/student/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold no-underline"
                >
                  Update Profile
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recommendations.map((alumnus) => (
                <div
                  key={alumnus.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={alumnus.full_name} src={alumnus.avatar_url} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{alumnus.full_name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                          {alumnus.matchingScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {[alumnus.job_title, alumnus.company].filter(Boolean).join(" • ") || "Verified Alumnus"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{alumnus.reasons?.[0]}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAlumnus(alumnus)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
                  >
                    Request Mentorship
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Resume Analysis & Quick Links */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3">Latest Resume Insights</h2>
            {latestAnalysis ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">{latestAnalysis.summary}</p>
                {latestAnalysis.recommended_skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Recommended Skills to Build</p>
                    <div className="flex flex-wrap gap-1.5">
                      {latestAnalysis.recommended_skills.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Link
                  to="/student/resume"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 no-underline pt-2"
                >
                  Open Full Resume Analyzer <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-4">
                  Upload your PDF resume to extract skills, uncover skill gaps, and unlock stronger mentor recommendations.
                </p>
                <Link
                  to="/student/resume"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold no-underline"
                >
                  Upload Resume PDF
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2.5">
            <h2 className="text-base font-bold text-slate-900 mb-2">Explore Platform</h2>
            <Link
              to="/student/alumni"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-brand-600" /> Alumni Directory</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/student/jobs"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
            >
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-600" /> Career Opportunities</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/student/events"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
            >
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" /> University Events</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      <MentorshipRequestModal
        alumnus={selectedAlumnus}
        open={Boolean(selectedAlumnus)}
        onClose={() => setSelectedAlumnus(null)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}
