import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Handshake,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatCard,
  StatusBadge,
} from "../../components/app/UI";

export default function AlumniDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/alumni/me/dashboard");
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

  const toggleAvailability = async () => {
    if (!data?.alumniProfile) return;
    setToggling(true);
    try {
      const next = !data.alumniProfile.is_available_for_mentorship;
      await api.put("/alumni/me/profile", { is_available_for_mentorship: next });
      setData((prev) => ({
        ...prev,
        alumniProfile: { ...prev.alumniProfile, is_available_for_mentorship: next },
      }));
      showToast(
        next ? "You are now available for mentorship requests." : "Mentorship availability paused.",
        "success"
      );
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading alumni dashboard..." />;

  const stats = data?.stats || {};
  const alum = data?.alumniProfile;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${data?.profile?.full_name || "Alumnus"}`}
        subtitle="Manage your mentorship availability, engage with students, and post career opportunities."
        actions={
          <button
            type="button"
            disabled={toggling}
            onClick={toggleAvailability}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
              alum?.is_available_for_mentorship
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
          >
            {alum?.is_available_for_mentorship ? "Mentorship: Open" : "Mentorship: Paused"}
          </button>
        }
      />

      <ErrorBanner message={error} onRetry={loadDashboard} />

      {alum && !alum.is_verified && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Profile Verification Pending</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Complete your professional profile so an institutional administrator can verify and list you in the Alumni Directory.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests || 0}
          subtitle={`${stats.totalRequests || 0} total received`}
          icon={Handshake}
          accent="amber"
        />
        <StatCard
          title="Active Mentees"
          value={stats.activeMentees || 0}
          subtitle="Connected students"
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          title="Jobs Posted"
          value={stats.jobsPosted || 0}
          subtitle="Career opportunities shared"
          icon={Briefcase}
          accent="brand"
        />
        <StatCard
          title="Community & Events"
          value={(stats.communityPosts || 0) + (stats.eventsRegistered || 0)}
          subtitle={`${stats.communityPosts || 0} posts • ${stats.eventsRegistered || 0} events`}
          icon={Calendar}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Mentorship Requests</h2>
            <Link to="/alumni/mentorship" className="text-xs font-semibold text-brand-600 no-underline">
              Manage All
            </Link>
          </div>

          {(data?.recentRequests || []).length === 0 ? (
            <p className="text-sm text-slate-500">No mentorship requests received yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{req.topic}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{req.message}</p>
                  </div>
                  <Link
                    to="/alumni/mentorship"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold no-underline shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 mb-2">Quick Actions</h2>
          <Link
            to="/alumni/profile"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Update Professional Profile
          </Link>
          <Link
            to="/alumni/jobs"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
          >
            <Briefcase className="w-4 h-4 text-brand-600" /> Post a Job or Internship
          </Link>
          <Link
            to="/alumni/community"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800 no-underline"
          >
            <MessageSquare className="w-4 h-4 text-sky-600" /> Share Career Advice
          </Link>
        </div>
      </div>
    </div>
  );
}
