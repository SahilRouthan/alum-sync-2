import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import { Modal } from "./UI";

export default function MentorshipRequestModal({ alumnus, open, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [topic, setTopic] = useState("Career Guidance & Interview Prep");
  const [goals, setGoals] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!alumnus) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/mentorship/requests", {
        alumniId: alumnus.id,
        topic,
        goals,
        message,
      });
      showToast(`Mentorship request sent to ${alumnus.full_name}!`, "success");
      setGoals("");
      setMessage("");
      onSuccess?.(res.request);
      onClose();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Request Mentorship from ${alumnus.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">{alumnus.full_name}</p>
          <p>
            {[alumnus.job_title, alumnus.company].filter(Boolean).join(" at ") || "Verified Alumnus"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mentorship Topic</label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Your Goals (optional)</label>
          <input
            type="text"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g. Resume review, system design prep, industry insights"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Personalized Message</label>
          <textarea
            rows={4}
            required
            minLength={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and explain why you'd value their mentorship..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Request
          </button>
        </div>
      </form>
    </Modal>
  );
}
