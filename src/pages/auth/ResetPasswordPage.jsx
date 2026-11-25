import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ensureSupabaseClient } from "../../services/supabaseClient";
import "../../styles/dashboard.css";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const errDesc =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      hashParams.get("error") ||
      searchParams.get("error");
    if (errDesc) {
      setError(errDesc.replace(/\+/g, " "));
      return;
    }

    const code = searchParams.get("code");
    if (code) {
      ensureSupabaseClient()
        .then((client) => client.auth.exchangeCodeForSession(code))
        .catch((err) => {
          setError(err.message || "Reset link is invalid or expired. Please request a new one.");
        });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(password);
      showToast("Password updated! Please log in.", "success");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="alumsync-app" className="alumsync-app">
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl p-8 shadow-2xl border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Enter your new password below.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            Update Password
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="text-brand-600 font-semibold no-underline">
            Return to login
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
