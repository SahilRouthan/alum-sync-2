import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, MessageSquare, XCircle } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

export default function StudentMentorshipPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, connRes] = await Promise.all([
        api.get("/mentorship/requests"),
        api.get("/mentorship/connections"),
      ]);
      setRequests(reqRes.requests || []);
      setConnections(connRes.connections || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cancelRequest = async (id) => {
    try {
      await api.patch(`/mentorship/requests/${id}/cancel`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
      showToast("Request cancelled.", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const openChatWithMentor = async (alumniUserId) => {
    if (!alumniUserId) {
      showToast("This alumnus has not activated a user login account yet.", "info");
      return;
    }
    try {
      const res = await api.post("/messages/conversations", { recipientId: alumniUserId });
      navigate(`/student/messages?conversation=${res.conversation.id}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (loading) return <LoadingSpinner label="Loading mentorship tracker..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Mentorship Connections & Requests"
        subtitle="Track mentorship request statuses and message your connected mentors."
      />
      <ErrorBanner message={error} onRetry={loadData} />

      {/* Active Connections */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Active Mentors ({connections.length})</h2>
        {connections.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No active mentorship connections yet"
            description="Browse the Alumni Directory or Smart Matches to send a mentorship request."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={conn.alumni?.full_name || "Mentor"} src={conn.alumni?.avatar_url} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{conn.alumni?.full_name}</h3>
                    <p className="text-xs text-slate-500">
                      {[conn.alumni?.job_title, conn.alumni?.company].filter(Boolean).join(" • ")}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={conn.status} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openChatWithMentor(conn.alumni_user_id || conn.alumni?.user_id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sent Requests */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Sent Requests ({requests.length})</h2>
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            You haven't sent any mentorship requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      {req.alumni?.full_name || "Alumnus"}
                    </h3>
                    <StatusBadge status={req.status} />
                    <span className="text-xs text-slate-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-brand-700 mt-1">{req.topic}</p>
                  <p className="text-xs text-slate-600 mt-1">{req.message}</p>
                  {req.response_note && (
                    <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <strong>Mentor Note:</strong> {req.response_note}
                    </p>
                  )}
                </div>

                {req.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => cancelRequest(req.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 shrink-0"
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
