import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Handshake, MessageSquare, XCircle } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

export default function AlumniMentorshipPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseNote, setResponseNote] = useState("");

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

  const handleRespond = async (status) => {
    if (!respondingTo) return;
    try {
      const res = await api.patch(`/mentorship/requests/${respondingTo.id}/respond`, {
        status,
        responseNote,
      });
      showToast(
        status === "accepted" ? "Mentorship request accepted!" : "Mentorship request declined.",
        "success"
      );
      setRespondingTo(null);
      setResponseNote("");
      loadData();
      if (status === "accepted" && res.conversation?.id) {
        // conversation created automatically
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const openChatWithStudent = async (studentId) => {
    try {
      const res = await api.post("/messages/conversations", { recipientId: studentId });
      navigate(`/alumni/messages?conversation=${res.conversation.id}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (loading) return <LoadingSpinner label="Loading mentorship requests..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mentorship Requests & Mentees"
        subtitle="Review incoming student mentorship requests and chat with connected mentees."
      />
      <ErrorBanner message={error} onRetry={loadData} />

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Connected Mentees ({connections.length})</h2>
        {connections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            No active mentees yet. Accept an incoming mentorship request to begin mentoring.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.student?.full_name || "Student"} src={c.student?.avatar_url} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{c.student?.full_name}</h3>
                    <p className="text-xs text-slate-500">{c.student?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openChatWithStudent(c.student_id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                >
                  <MessageSquare className="w-4 h-4" /> Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Incoming Requests ({requests.length})</h2>
        {requests.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No mentorship requests yet"
            description="Make sure your profile is verified and marked available for mentorship."
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={req.student?.full_name || "Student"} src={req.student?.avatar_url} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{req.student?.full_name || "Student"}</h3>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs font-semibold text-brand-700 mt-0.5">{req.topic}</p>
                    {req.goals && <p className="text-xs text-slate-500 mt-0.5">Goals: {req.goals}</p>}
                    <p className="text-sm text-slate-700 mt-2">{req.message}</p>
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRespondingTo({ ...req, intendedAction: "accepted" })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespondingTo({ ...req, intendedAction: "rejected" })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50"
                    >
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(respondingTo)}
        onClose={() => setRespondingTo(null)}
        title={respondingTo?.intendedAction === "accepted" ? "Accept Mentorship Request" : "Decline Mentorship Request"}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Student: <strong>{respondingTo?.student?.full_name}</strong>
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Note for Student
            </label>
            <textarea
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder="Share availability or a brief note..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRespondingTo(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleRespond(respondingTo.intendedAction)}
              className={`px-5 py-2 rounded-xl text-white text-sm font-semibold ${
                respondingTo?.intendedAction === "accepted"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              Confirm {respondingTo?.intendedAction === "accepted" ? "Accept" : "Decline"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
