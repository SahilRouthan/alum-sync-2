import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { roleHomePath } from "../../components/app/ProtectedRoute";
import SocialAuthButtons from "../../components/app/SocialAuthButtons";
import "../../styles/dashboard.css";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login({ email, password });
      showToast(`Welcome back, ${data.profile?.full_name || "user"}!`, "success");
      navigate(roleHomePath(data.profile?.role), { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
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
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white font-display font-extrabold text-sm flex items-center justify-center">
              AS
            </div>
            <span className="font-display font-extrabold text-xl text-slate-900">
              Alum<span className="text-brand-600">Sync</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Sign in to your portal</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Access your Student, Alumni, or Administrator dashboard.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <SocialAuthButtons onError={setError} dividerLabel="or log in with email" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700 no-underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Signing in..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to AlumSync?{" "}
            <Link to="/signup" className="text-brand-600 font-semibold hover:text-brand-700 no-underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
