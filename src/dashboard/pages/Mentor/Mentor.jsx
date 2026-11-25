import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useToast } from "../../../context/ToastContext";
import MentorshipRequestModal from "../../../components/app/MentorshipRequestModal";

const Mentor = () => {
  const { mentorStats, mentors, loading, searchQuery, userData, basePath } = useContext(UserContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedMentor, setSelectedMentor] = useState(null);

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) =>
      [m.name, m.role, m.batch, ...(m.skills || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [mentors, searchQuery]);

  const handleBookSession = (mentor) => {
    const isUuid = typeof mentor.id === "string" && mentor.id.includes("-") && mentor.id.length > 20;
    if (isUuid && userData?.portalRole === "student") {
      setSelectedMentor({
        id: mentor.id,
        user_id: mentor.user_id,
        full_name: mentor.name,
        job_title: mentor.role,
        company: "",
      });
    } else {
      showToast(`Mentorship request queued for ${mentor.name}!`, "success");
    }
  };

  const stats = [
    { num: mentorStats?.activeMentors ?? filteredMentors.length, label: "Active Mentors", chg: "Ongoing sessions", up: true },
    { num: mentorStats?.sessionsDone ?? "—", label: "Sessions Done", chg: "↑ +2 this month", up: true },
    { num: mentorStats?.avgRating ?? "—", label: "Avg Rating", chg: "⭐ Excellent", up: true },
    { num: mentorStats?.mentorsAvailable ?? filteredMentors.length, label: "Mentors Available", chg: "Active now", up: true },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 md:h-[calc(100vh-70px)] md:overflow-y-auto no-scrollbar">
      <h1 className="font-sora text-2xl font-bold text-text-main">Mentorship Portal</h1>
      <p className="text-sm text-text-muted mt-1 mb-6">
        Connect with experienced alumni for 1-on-1 guidance
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
        <div className="as-card p-10 text-center text-text-muted text-sm">Loading mentors...</div>
      )}

      {!loading && filteredMentors?.length === 0 && (
        <div className="as-card p-10 text-center text-text-muted text-sm">
          No mentors available right now — check back soon.
        </div>
      )}

      {!loading && filteredMentors?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMentors.map((mentor) => (
            <div key={mentor.id} className="as-card p-4 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm text-white flex-shrink-0"
                  style={{ background: mentor.avatarColor }}
                >
                  {mentor.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-text-main">{mentor.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{mentor.role}</div>
                  <div className="text-[11px] text-accent-violet font-semibold mt-0.5">{mentor.batch}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 my-2.5">
                {(mentor.skills || []).map((skill) => (
                  <span
                    key={skill}
                    className="text-[10.5px] font-semibold px-2.5 py-1 rounded bg-accent text-primary-soft"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-input-bg rounded-lg text-center py-2">
                  <div className="font-sora font-extrabold text-[15px] text-accent-violet">{mentor.mentees}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Mentees</div>
                </div>
                <div className="bg-input-bg rounded-lg text-center py-2">
                  <div className="font-sora font-extrabold text-[15px] text-accent-violet">{mentor.rating}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Rating</div>
                </div>
                <div className="bg-input-bg rounded-lg text-center py-2">
                  <div className="font-sora font-extrabold text-[15px] text-accent-violet">{mentor.availability}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Available</div>
                </div>
              </div>

              <div className="flex gap-1.5 mt-auto">
                <button
                  type="button"
                  onClick={() => handleBookSession(mentor)}
                  className="btn-primary py-1.5 px-4 text-xs"
                >
                  Book Session
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/network`)}
                  className="text-xs font-bold text-primary-violet border border-border-subtle rounded-full px-4 py-1.5 hover:bg-hover-bg transition-all active:scale-95"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MentorshipRequestModal
        alumnus={selectedMentor}
        open={Boolean(selectedMentor)}
        onClose={() => setSelectedMentor(null)}
      />
    </div>
  );
};

export default Mentor;
