import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../services/supabaseClient";
import { roleHomePath } from "../../components/app/ProtectedRoute";
import "../../styles/dashboard.css";

export default function OAuthCallbackPage() {
  const { syncOAuthProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function completeOAuth() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = new URLSearchParams(window.location.search);
        const errDesc =
          hashParams.get("error_description") ||
          searchParams.get("error_description") ||
          hashParams.get("error") ||
          searchParams.get("error");

        if (errDesc) {
          throw new Error(errDesc.replace(/\+/g, " "));
        }

        if (!supabase) {
          throw new Error("Supabase client is not configured.");
        }

        const code = searchParams.get("code");
        const { data: initialSession } = await supabase.auth.getSession();

        if (!initialSession?.session && code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        }

        // Wait briefly for implicit hash session detection if not immediately populated
        let session = (await supabase.auth.getSession())?.data?.session;
        if (!session) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          session = (await supabase.auth.getSession())?.data?.session;
        }

        if (!session) {
          throw new Error("Could not complete sign-in session. Please try logging in again.");
        }

        const data = await syncOAuthProfile();
        if (!active) return;

        showToast(`Welcome, ${data.profile?.full_name || "member"}!`, "success");
        navigate(roleHomePath(data.profile?.role), { replace: true });
      } catch (err) {
        if (!active) return;
        setError(err.message || "OAuth sign-in failed.");
      }
    }

    completeOAuth();
    return () => {
      active = false;
    };
  }, [navigate, showToast, syncOAuthProfile]);

  return (
    <div id="alumsync-app" className="alumsync-app">
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-12">
        <div className="max-w-md w-full mx-auto bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Sign-in could not be completed</h1>
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {error}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 no-underline"
                >
                  Back to Login
                </Link>
                <Link
                  to="/"
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 no-underline"
                >
                  Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <h1 className="text-lg font-bold text-slate-900">Completing your sign-in...</h1>
              <p className="text-sm text-slate-500">
                Connecting your account and loading your AlumSync portal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
