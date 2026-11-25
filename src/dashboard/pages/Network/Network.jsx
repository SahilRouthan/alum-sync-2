import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useToast } from "../../../context/ToastContext";
import MentorshipRequestModal from "../../../components/app/MentorshipRequestModal";

const Network = () => {
  const { networkStats, userData, alumniDirectory, loading, searchQuery, basePath } =
    useContext(UserContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedMentor, setSelectedMentor] = useState(null);

  const filteredAlumni = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return alumniDirectory;
    return alumniDirectory.filter((person) =>
      [person.name, person.email, person.role, person.batch, ...(person.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [alumniDirectory, searchQuery]);

  const handleConnect = (person) => {
    const isUuid = typeof person.id === "string" && person.id.includes("-") && person.id.length > 20;
    if (isUuid && userData?.portalRole === "student") {
      setSelectedMentor({
        id: person.id,
        user_id: person.user_id,
        full_name: person.name,
        job_title: person.job_title || person.role,
        company: person.company || "",
      });
    } else {
      showToast(`Connection request sent to ${person.name}!`, "success");
    }
  };

  const stats = [
    {
      num: filteredAlumni.length,
      label: "Alumni in Directory",
      chg: "Live database records",
      up: true,
    },
    { num: userData?.stats?.connections ?? "—", label: "Your Connections", chg: "↑ +8 this week", up: true },
    { num: networkStats?.onlineNow ?? "—", label: "Online Now", chg: "● Active", up: true },
    { num: networkStats?.responseRate ?? "—", label: "Response Rate", chg: "Excellent", up: true },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 md:h-[calc(100vh-70px)] md:overflow-y-auto no-scrollbar">
      <h1 className="font-sora text-2xl font-bold text-text-main">Alumni Network</h1>
      <p className="text-sm text-text-muted mt-1 mb-6">
        Discover and connect with {filteredAlumni.length} verified alumni
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
        <div className="as-card p-10 text-center text-text-muted text-sm">Loading alumni directory...</div>
      )}

      {!loading && filteredAlumni?.length === 0 && (
        <div className="as-card p-10 text-center text-text-muted text-sm">
          No alumni profiles to show yet.
        </div>
      )}

      {!loading && filteredAlumni?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredAlumni.map((person) => (
            <div key={person.id} className="as-card p-4 hover:border-primary/40 transition-all flex flex-col">
              <div
                className="w-[50px] h-[50px] rounded-full flex items-center justify-center font-extrabold text-[15px] text-white mb-2.5"
                style={{ background: person.avatarColor }}
              >
                {person.avatar}
              </div>
              <div className="font-bold text-sm text-text-main">{person.name}</div>
              {person.email && <div className="text-xs text-text-muted mt-0.5 break-all">{person.email}</div>}
              {person.role && <div className="text-xs text-text-muted mt-1">{person.role}</div>}
              {person.batch && <div className="text-[11px] text-accent-violet font-semibold mt-1">{person.batch}</div>}

              <div className="flex flex-wrap gap-1.5 mt-2">
                {(person.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-accent text-primary-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5 mt-auto pt-3">
                <button
                  type="button"
                  onClick={() => handleConnect(person)}
                  className="text-xs font-bold text-white bg-primary-violet px-3 py-1.5 rounded-lg hover:opacity-90 transition-all active:scale-95"
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/messages`)}
                  className="text-xs font-bold text-primary-violet border border-border-subtle px-3 py-1.5 rounded-lg hover:bg-hover-bg transition-all active:scale-95"
                >
                  Message
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

export default Network;
