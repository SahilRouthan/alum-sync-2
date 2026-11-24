import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "./UI";

export function roleHomePath(role) {
  if (role === "admin") return "/admin";
  if (role === "alumni") return "/alumni";
  return "/student";
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div id="alumsync-app" className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoadingSpinner label="Verifying your session..." />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleHomePath(profile.role)} replace />;
  }

  return children;
}
