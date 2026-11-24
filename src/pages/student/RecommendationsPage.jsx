import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { api } from "../../services/apiClient";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
} from "../../components/app/UI";
import MentorshipRequestModal from "../../components/app/MentorshipRequestModal";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);

  const loadMatches = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/student/recommendations?limit=20");
      setRecommendations(res.recommendations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  if (loading) return <LoadingSpinner label="Computing personalized alumni matches..." />;

  return (
    <div>
      <PageHeader
        title="Smart Alumni Matching Engine"
        subtitle="Transparent weighted scoring: Skills (40%), Industry (25%), Role (20%), Education (10%), Experience (5%)."
      />
      <ErrorBanner message={error} onRetry={loadMatches} />

      {recommendations.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No recommendations available yet"
          description="Add your skills and career goals or upload your resume to compute matches against verified alumni."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {recommendations.map((alumnus) => {
            const b = alumnus.scoreBreakdown || {};
            return (
              <div
                key={alumnus.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={alumnus.full_name} src={alumnus.avatar_url} size="lg" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{alumnus.full_name}</h3>
                        <p className="text-sm text-slate-600">
                          {[alumnus.job_title, alumnus.company].filter(Boolean).join(" at ")}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[alumnus.industry, alumnus.location].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="px-3 py-1 rounded-full bg-brand-600 text-white text-sm font-bold">
                        {alumnus.matchingScore}% Match
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-5 gap-2 mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <p className="text-[11px] text-slate-500">Skills</p>
                      <p className="text-xs font-bold text-slate-900">{b.skillsScore || 0}/40</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Industry</p>
                      <p className="text-xs font-bold text-slate-900">{b.industryScore || 0}/25</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Role</p>
                      <p className="text-xs font-bold text-slate-900">{b.roleScore || 0}/20</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Education</p>
                      <p className="text-xs font-bold text-slate-900">{b.educationScore || 0}/10</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Experience</p>
                      <p className="text-xs font-bold text-slate-900">{b.experienceScore || 0}/5</p>
                    </div>
                  </div>

                  {/* Why recommended */}
                  <div className="mt-4 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Why Recommended
                    </p>
                    {(alumnus.reasons || []).map((r, idx) => (
                      <p key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>

                  {alumnus.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {alumnus.skills.slice(0, 8).map((s) => {
                        const isMatched = (alumnus.matchedSkills || []).includes(s);
                        return (
                          <span
                            key={s}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isMatched
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    disabled={!alumnus.is_available_for_mentorship}
                    onClick={() => setSelectedAlumnus(alumnus)}
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                  >
                    {alumnus.is_available_for_mentorship ? "Request Mentorship" : "Mentorship Paused"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MentorshipRequestModal
        alumnus={selectedAlumnus}
        open={Boolean(selectedAlumnus)}
        onClose={() => setSelectedAlumnus(null)}
      />
    </div>
  );
}
