import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Building2, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { roleHomePath } from "../../components/app/ProtectedRoute";
import SocialAuthButtons from "../../components/app/SocialAuthButtons";
import "../../styles/dashboard.css";

export default function SignupPage() {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await signup(form);
      showToast("Account created successfully!", "success");
      if (data.session) {
        navigate(roleHomePath(data.profile?.role || form.role), { replace: true });
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Could not register account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="alumsync-app" className="alumsync-app">
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to AlumSync Home
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Create your AlumSync account</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Register as a Student or Alumni to join the institutional network.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <SocialAuthButtons role={form.role} onError={setError} dividerLabel="or sign up with email" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Aditya"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Mehra"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@institution.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">I am joining as a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "student" })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    form.role === "student"
                      ? "bg-brand-50 border-brand-500 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" /> Student
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "alumni" })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    form.role === "alumni"
                      ? "bg-brand-50 border-brand-500 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Alumni
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Administrator accounts are provisioned by your institution.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 no-underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
