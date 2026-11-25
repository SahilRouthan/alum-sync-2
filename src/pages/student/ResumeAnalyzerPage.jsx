import { useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
} from "../../components/app/UI";
import MentorshipRequestModal from "../../components/app/MentorshipRequestModal";

const TARGET_ROLE_OPTIONS = [
  "",
  "Full-Stack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "Data Scientist / ML Engineer",
  "Cloud & DevOps Engineer",
  "Product Manager",
];

export default function ResumeAnalyzerPage() {
  const { showToast } = useToast();

  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [matchingAlumni, setMatchingAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [mentorAlumnus, setMentorAlumnus] = useState(null);

  const loadResumes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/resumes");
      const list = res.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        await selectResumeDetail(list[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectResumeDetail = async (id) => {
    try {
      const res = await api.get(`/resumes/${id}`);
      setSelectedResume(res.resume);
      setMatchingAlumni(res.matchingAlumni || []);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast("Please select a PDF file first.", "error");
      return;
    }
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      showToast("Only PDF files are supported.", "error");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast("PDF file must be 10 MB or smaller.", "error");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("resume", selectedFile);
      if (targetRole) fd.append("targetRole", targetRole);

      const res = await api.upload("/resumes/upload", fd);
      showToast("Resume uploaded & analyzed!", "success");
      setSelectedFile(null);
      setSelectedResume({ ...res.resume, resume_analysis: [res.analysis] });
      setMatchingAlumni(res.matchingAlumni || []);
      const listRes = await api.get("/resumes");
      setResumes(listRes.resumes || []);
    } catch (err) {
      const msg = err.message || "Failed to upload and analyze resume.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedResume) return;
    setReanalyzing(true);
    try {
      const res = await api.post(`/resumes/${selectedResume.id}/analyze`, { targetRole });
      setSelectedResume((prev) => ({ ...prev, resume_analysis: [res.analysis] }));
      setMatchingAlumni(res.matchingAlumni || []);
      showToast("Resume re-analyzed for target role!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/resumes/${id}`);
      const next = resumes.filter((r) => r.id !== id);
      setResumes(next);
      if (selectedResume?.id === id) {
        setSelectedResume(next[0] || null);
      }
      showToast("Resume deleted.", "info");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const analysis = Array.isArray(selectedResume?.resume_analysis)
    ? selectedResume.resume_analysis[0]
    : selectedResume?.resume_analysis;

  if (loading) return <LoadingSpinner label="Loading Smart Resume Analyzer..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Resume Analyzer"
        subtitle="Upload your PDF resume to extract skills, uncover skill gaps against alumni benchmarks, and match with mentors."
      />
      <ErrorBanner message={error} onRetry={loadResumes} />

      {/* Upload Box */}
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 min-w-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload Resume (PDF, max 10MB — OCR enabled for scanned PDFs)
            </label>
            <label className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 px-4 py-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 cursor-pointer bg-slate-50/70">
              <UploadCloud className="w-6 h-6 text-brand-600 shrink-0" />
              <span className="text-sm text-slate-700 font-medium text-center break-all">
                {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : "Click to select a PDF resume"}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Career Role (optional)
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              >
                <option value="">Auto-detect best role fit</option>
                {TARGET_ROLE_OPTIONS.filter(Boolean).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {uploading ? "Extracting & Analyzing..." : "Upload & Analyze PDF"}
            </button>
          </div>
        </div>
      </form>

      {/* Saved Resumes Selector */}
      {resumes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {resumes.map((r) => (
            <div
              key={r.id}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold max-w-full ${
                selectedResume?.id === r.id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => selectResumeDetail(r.id)}
                className="inline-flex items-center gap-1.5 text-current min-w-0"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{r.file_name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="opacity-70 hover:opacity-100"
                title="Delete resume"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!selectedResume || !analysis ? (
        <EmptyState
          icon={FileText}
          title="No resume analyzed yet"
          description="Upload your PDF resume above to see extracted skills, education, skill-gap analysis, and matched alumni mentors."
        />
      ) : (
        <div className="space-y-6">
          {/* Top Summary & Re-analyze */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                  Completeness Score: {analysis.completeness_score}%
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  Target Role: {analysis.target_role}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
                  Method: {selectedResume.extraction_method || "pdf-parse"}
                </span>
              </div>
              <p className="text-sm text-slate-700 pt-2">{analysis.summary}</p>
            </div>

            <button
              type="button"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${reanalyzing ? "animate-spin" : ""}`} />
              Re-analyze for Selected Role
            </button>
          </div>

          {/* Skills & Skill Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">Extracted Skills</h2>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Technical Skills ({analysis.technical_skills?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.technical_skills || []).length === 0 ? (
                    <span className="text-xs text-slate-400">None detected</span>
                  ) : (
                    analysis.technical_skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Soft Skills ({analysis.soft_skills?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.soft_skills || []).length === 0 ? (
                    <span className="text-xs text-slate-400">None explicitly detected</span>
                  ) : (
                    analysis.soft_skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900">Skill-Gap Analysis & Recommended Skills</h2>
              {(analysis.skill_gaps || []).length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Great coverage for {analysis.target_role}!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {analysis.skill_gaps.map((gap, i) => (
                    <div
                      key={`${gap.skill}-${i}`}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{gap.skill}</p>
                        <p className="text-xs text-slate-600">{gap.reason}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-semibold text-amber-800 capitalize shrink-0">
                        {gap.source === "alumni_network" ? "Alumni Demand" : "Role Core"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Education, Experience, Projects, Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-600" /> Education Summary
              </h2>
              {(analysis.education || []).length === 0 ? (
                <p className="text-xs text-slate-400">No structured education entries extracted.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700">
                  {analysis.education.map((ed, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-900">{ed.title}</p>
                      {ed.years && <p className="text-xs text-slate-500">{ed.years}</p>}
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pt-3">
                <Briefcase className="w-4 h-4 text-sky-600" /> Work Experience
              </h2>
              {(analysis.work_experience || []).length === 0 ? (
                <p className="text-xs text-slate-400">No experience entries extracted.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700">
                  {analysis.work_experience.map((exp, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      {exp.details && <p className="text-xs text-slate-600 mt-0.5">{exp.details}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Career Role Alignment & Suggestions
              </h2>
              <div className="space-y-2.5">
                {(analysis.career_recommendations || []).map((rec) => (
                  <div key={rec.role} className="p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-900">{rec.role}</span>
                      <span className="text-brand-700">{rec.fitScore}% Skill Match</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full"
                        style={{ width: `${rec.fitScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Improvement Suggestions</p>
                <ul className="space-y-2">
                  {(analysis.improvement_suggestions || []).map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Matching Alumni Based on Resume */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Matching Alumni & Potential Mentors ({matchingAlumni.length})
            </h2>
            {matchingAlumni.length === 0 ? (
              <p className="text-sm text-slate-500">
                No verified alumni profiles matched yet. Once alumni profiles are verified, matches will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingAlumni.map((alumnus) => (
                  <div key={alumnus.id} className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={alumnus.full_name} src={alumnus.avatar_url} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{alumnus.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {[alumnus.job_title, alumnus.company].filter(Boolean).join(" • ")}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
                          {alumnus.matchingScore}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">{alumnus.reasons?.[0]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMentorAlumnus(alumnus)}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      Request Mentorship
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MentorshipRequestModal
        alumnus={mentorAlumnus}
        open={Boolean(mentorAlumnus)}
        onClose={() => setMentorAlumnus(null)}
      />
    </div>
  );
}
