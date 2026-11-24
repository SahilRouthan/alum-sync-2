import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  Handshake,
  ShieldCheck,
  Upload,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { api } from "../../services/apiClient";
import {
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatCard,
  StatusBadge,
} from "../../components/app/UI";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/overview");
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) return <LoadingSpinner label="Loading institutional analytics..." />;

  const stats = data?.stats || {};
  const analytics = data?.analytics || {};
  const maxIndustry = Math.max(1, ...(analytics.byIndustry || []).map((i) => i.count));
  const maxCompany = Math.max(1, ...(analytics.topCompanies || []).map((c) => c.count));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Administrator Overview & Analytics"
        subtitle="Monitor institutional alumni records, verification queues, mentorship engagement, and CSV imports."
        actions={
          <Link
            to="/admin/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 no-underline"
          >
            <Upload className="w-4 h-4" /> Bulk CSV Import
          </Link>
        }
      />

      <ErrorBanner message={error} onRetry={loadOverview} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Registered Students"
          value={stats.totalStudents || 0}
          subtitle="Active student accounts"
          icon={GraduationCap}
          accent="sky"
        />
        <StatCard
          title="Total Alumni Records"
          value={stats.totalAlumni || 0}
          subtitle={`${stats.verifiedAlumni || 0} verified • ${stats.unverifiedAlumni || 0} unverified`}
          icon={Users}
          accent="brand"
        />
        <StatCard
          title="Verified Alumni"
          value={stats.verifiedAlumni || 0}
          subtitle="Approved for student discovery"
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          title="Pending Verification"
          value={stats.unverifiedAlumni || 0}
          subtitle="Awaiting admin review"
          icon={UserX}
          accent="amber"
        />
        <StatCard
          title="Mentorship Requests"
          value={stats.totalMentorshipRequests || 0}
          subtitle={`${stats.pendingMentorshipRequests || 0} pending review`}
          icon={Handshake}
          accent="rose"
        />
        <StatCard
          title="Active Connections"
          value={stats.activeConnections || 0}
          subtitle={`${stats.totalEvents || 0} events • ${stats.totalJobs || 0} jobs`}
          icon={ShieldCheck}
          accent="emerald"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Alumni by Industry</h2>
          {(analytics.byIndustry || []).length === 0 ? (
            <p className="text-sm text-slate-400">No industry data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.byIndustry.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>{item.name}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${(item.count / maxIndustry) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" /> Top Alumni Employers
          </h2>
          {(analytics.topCompanies || []).length === 0 ? (
            <p className="text-sm text-slate-400">No employer data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.topCompanies.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>{item.name}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${(item.count / maxCompany) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent CSV Imports */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Recent Bulk Imports</h2>
          <Link to="/admin/import" className="text-xs font-semibold text-brand-600 no-underline">
            View Full History
          </Link>
        </div>
        {(data?.recentImports || []).length === 0 ? (
          <p className="text-sm text-slate-500">No CSV imports executed yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentImports.map((imp) => (
              <div key={imp.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{imp.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(imp.created_at).toLocaleString()} • {imp.imported_rows}/{imp.total_rows} imported •{" "}
                    {imp.duplicate_rows} duplicates • {imp.error_rows} errors
                  </p>
                </div>
                <StatusBadge status={imp.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
