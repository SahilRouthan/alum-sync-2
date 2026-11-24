import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Globe, MapPin, Plus, Trash2, Users } from "lucide-react";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  Modal,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

export default function EventsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const canCreate = ["alumni", "admin"].includes(profile?.role);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "webinar",
    location: "",
    is_virtual: true,
    meeting_link: "",
    event_date: "",
    max_attendees: "",
  });

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/events");
      setEvents(res.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/events", {
        ...form,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      });
      setEvents((prev) => [res.event, ...prev]);
      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        event_type: "webinar",
        location: "",
        is_virtual: true,
        meeting_link: "",
        event_date: "",
        max_attendees: "",
      });
      showToast("Event created!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRegistration = async (ev) => {
    try {
      if (ev.isRegistered) {
        await api.delete(`/events/${ev.id}/register`);
        setEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id
              ? { ...item, isRegistered: false, registrationsCount: Math.max(0, item.registrationsCount - 1) }
              : item
          )
        );
        showToast("Event registration cancelled.", "info");
      } else {
        await api.post(`/events/${ev.id}/register`);
        setEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id
              ? { ...item, isRegistered: true, registrationsCount: item.registrationsCount + 1 }
              : item
          )
        );
        showToast("Registered for event!", "success");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast("Event deleted.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="University Events & Webinars"
        subtitle="Discover alumni talks, reunions, career fairs, and workshops."
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Create Event
            </button>
          )
        }
      />

      <ErrorBanner message={error} onRetry={loadEvents} />

      {loading ? (
        <LoadingSpinner label="Loading upcoming events..." />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="Check back soon for upcoming alumni webinars, workshops, and reunions."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold capitalize">
                      {ev.event_type.replace("_", " ")}
                    </span>
                    <StatusBadge status={ev.status} />
                  </div>
                  {(ev.organizer_id === profile?.id || profile?.role === "admin") && (
                    <button
                      type="button"
                      onClick={() => handleDelete(ev.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-3">{ev.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ev.description}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span>{new Date(ev.event_date).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.is_virtual ? (
                      <Globe className="w-4 h-4 text-sky-600" />
                    ) : (
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{ev.is_virtual ? "Virtual Event" : ev.location || "Campus"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>
                      {ev.registrationsCount} registered
                      {ev.max_attendees ? ` / ${ev.max_attendees} seats` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Hosted by {ev.organizer?.full_name || "Institution"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleRegistration(ev)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    ev.isRegistered
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {ev.isRegistered && <CheckCircle2 className="w-4 h-4" />}
                  {ev.isRegistered ? "Registered (Cancel)" : "Register Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create University Event">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              >
                <option value="webinar">Webinar</option>
                <option value="workshop">Workshop</option>
                <option value="reunion">Reunion</option>
                <option value="networking">Networking</option>
                <option value="career_fair">Career Fair</option>
                <option value="seminar">Seminar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ev-virtual"
              type="checkbox"
              checked={form.is_virtual}
              onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })}
            />
            <label htmlFor="ev-virtual" className="text-sm text-slate-700">Virtual Event</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {form.is_virtual ? "Meeting Link" : "Location"}
              </label>
              <input
                type={form.is_virtual ? "url" : "text"}
                value={form.is_virtual ? form.meeting_link : form.location}
                onChange={(e) =>
                  form.is_virtual
                    ? setForm({ ...form, meeting_link: e.target.value })
                    : setForm({ ...form, location: e.target.value })
                }
                placeholder={form.is_virtual ? "https://meet.google.com/..." : "Main Auditorium"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Seats (optional)</label>
              <input
                type="number"
                min="1"
                value={form.max_attendees}
                onChange={(e) => setForm({ ...form, max_attendees: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
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
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
