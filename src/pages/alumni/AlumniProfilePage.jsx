import { useEffect, useState } from "react";
import { Camera, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Avatar,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  SkillTagInput,
  StatusBadge,
} from "../../components/app/UI";

export default function AlumniProfilePage() {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("pending");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    avatar_url: "",
    phone: "",
    location: "",
    bio: "",
    degree: "",
    department: "",
    graduation_year: "",
    company: "",
    job_title: "",
    industry: "",
    years_of_experience: 0,
    linkedin_url: "",
    is_available_for_mentorship: true,
    max_mentees: 5,
    mentorship_topics: [],
    skills: [],
    experience: [],
    education: [],
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/alumni/me/profile");
        const p = res.profile || {};
        const ap = res.alumniProfile || {};
        setVerificationStatus(ap.verification_status || "pending");
        setForm({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          full_name: ap.full_name || p.full_name || "",
          avatar_url: ap.avatar_url || p.avatar_url || "",
          phone: p.phone || "",
          location: ap.location || p.location || "",
          bio: ap.bio || p.bio || "",
          degree: ap.degree || "",
          department: ap.department || "",
          graduation_year: ap.graduation_year || "",
          company: ap.company || "",
          job_title: ap.job_title || "",
          industry: ap.industry || "",
          years_of_experience: ap.years_of_experience || 0,
          linkedin_url: ap.linkedin_url || "",
          is_available_for_mentorship: ap.is_available_for_mentorship ?? true,
          max_mentees: ap.max_mentees || 5,
          mentorship_topics: ap.mentorship_topics || [],
          skills: res.skills || [],
          experience: Array.isArray(ap.experience) ? ap.experience : [],
          education: Array.isArray(ap.education) ? ap.education : [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.upload("/alumni/me/avatar", fd);
      setForm((prev) => ({ ...prev, avatar_url: res.avatarUrl }));
      await refreshProfile();
      showToast("Profile photo updated!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/alumni/me/profile", form);
      await refreshProfile();
      showToast("Alumni profile saved!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading alumni profile..." />;

  return (
    <div>
      <PageHeader
        title="Professional Alumni Profile"
        subtitle="Showcase your career journey, skills, and mentorship preferences."
        actions={<StatusBadge status={verificationStatus} />}
      />
      <ErrorBanner message={error} />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Photo & Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <Avatar name={form.full_name} src={form.avatar_url} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-base font-bold text-slate-900">{form.full_name || "Alumni Member"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a professional photograph (PNG, JPEG, or WebP up to 5MB).
            </p>
            <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800">
              {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Career & Education */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Career & Educational Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Microsoft"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Job Position</label>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Software & Cloud"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.years_of_experience}
                onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Degree</label>
              <input
                type="text"
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
                placeholder="e.g. B.Tech"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
              <input
                type="number"
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                placeholder="2020"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Bengaluru, India"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        {/* Experience Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Work Experience History</h2>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  experience: [...form.experience, { company: "", role: "", period: "" }],
                })
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
            >
              <Plus className="w-4 h-4" /> Add Role
            </button>
          </div>
          {form.experience.map((exp, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <input
                type="text"
                placeholder="Company"
                value={exp.company || ""}
                onChange={(e) => {
                  const next = [...form.experience];
                  next[idx] = { ...next[idx], company: e.target.value };
                  setForm({ ...form, experience: next });
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Role / Designation"
                value={exp.role || ""}
                onChange={(e) => {
                  const next = [...form.experience];
                  next[idx] = { ...next[idx], role: e.target.value };
                  setForm({ ...form, experience: next });
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Period (e.g. 2021 - Present)"
                value={exp.period || ""}
                onChange={(e) => {
                  const next = [...form.experience];
                  next[idx] = { ...next[idx], period: e.target.value };
                  setForm({ ...form, experience: next });
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, experience: form.experience.filter((_, i) => i !== idx) })
                }
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl w-fit"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Skills & Mentorship */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900">Skills & Mentorship Settings</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Technical & Soft Skills</label>
            <SkillTagInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mentorship Topics</label>
            <SkillTagInput
              value={form.mentorship_topics}
              onChange={(mentorship_topics) => setForm({ ...form, mentorship_topics })}
              placeholder="e.g. Resume Reviews, Mock Interviews, System Design"
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_available_for_mentorship}
                onChange={(e) => setForm({ ...form, is_available_for_mentorship: e.target.checked })}
              />
              Available for student mentorship requests
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Max Active Mentees:</label>
              <input
                type="number"
                min="1"
                max="25"
                value={form.max_mentees}
                onChange={(e) => setForm({ ...form, max_mentees: Number(e.target.value) })}
                className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Alumni Profile
          </button>
        </div>
      </form>
    </div>
  );
}
