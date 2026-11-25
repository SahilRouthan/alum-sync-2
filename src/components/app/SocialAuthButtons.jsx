import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SocialAuthButtons({ role, onError, dividerLabel = "or continue with email" }) {
  const { loginWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleOAuth = async (provider) => {
    setLoadingProvider(provider);
    onError?.("");
    try {
      await loginWithOAuth(provider, { role });
    } catch (err) {
      onError?.(err.message || `Could not sign in with ${provider}.`);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={Boolean(loadingProvider)}
          onClick={() => handleOAuth("google")}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
          )}
          <span>Google</span>
        </button>

        <button
          type="button"
          disabled={Boolean(loadingProvider)}
          onClick={() => handleOAuth("github")}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loadingProvider === "github" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0 text-slate-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
            </svg>
          )}
          <span>GitHub</span>
        </button>
      </div>

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-slate-200" />
        <span className="mx-3 text-xs font-medium text-slate-400 shrink-0">{dividerLabel}</span>
        <div className="flex-grow border-t border-slate-200" />
      </div>
    </div>
  );
}
