import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute, { roleHomePath } from "./components/app/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import FeatureDashboardShell, { LegacyModuleFrame } from "./dashboard/components/FeatureDashboardShell";
import DashboardHome from "./dashboard/pages/Home/Home";
import DashboardNetwork from "./dashboard/pages/Network/Network";
import DashboardJobs from "./dashboard/pages/Jobs/Jobs";
import DashboardMentor from "./dashboard/pages/Mentor/Mentor";
import DashboardAlerts from "./dashboard/pages/Alerts/Alerts";

import StudentProfilePage from "./pages/student/StudentProfilePage";
import ResumeAnalyzerPage from "./pages/student/ResumeAnalyzerPage";
import RecommendationsPage from "./pages/student/RecommendationsPage";
import StudentMentorshipPage from "./pages/student/StudentMentorshipPage";

import AlumniProfilePage from "./pages/alumni/AlumniProfilePage";
import AlumniMentorshipPage from "./pages/alumni/AlumniMentorshipPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlumniPage from "./pages/admin/AdminAlumniPage";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminCsvImportPage from "./pages/admin/AdminCsvImportPage";
import AdminModerationPage from "./pages/admin/AdminModerationPage";

import EventsPage from "./pages/shared/EventsPage";
import MessagesPage from "./pages/shared/MessagesPage";

function RoleShell({ allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <FeatureDashboardShell>
        <Outlet />
      </FeatureDashboardShell>
    </ProtectedRoute>
  );
}

function RoleRedirect({ suffix = "" }) {
  const { isAuthenticated, profile, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={`${roleHomePath(profile.role)}${suffix}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Existing Landing Page preserved untouched at root */}
            <Route path="/" element={<LandingPage />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Student Portal (Feature Dashboard Integration) */}
            <Route path="/student" element={<RoleShell allowedRoles={["student"]} />}>
              <Route index element={<DashboardHome />} />
              <Route path="network" element={<DashboardNetwork />} />
              <Route path="alumni" element={<DashboardNetwork />} />
              <Route path="jobs" element={<DashboardJobs />} />
              <Route path="mentor" element={<DashboardMentor />} />
              <Route path="mentorship" element={<LegacyModuleFrame><StudentMentorshipPage /></LegacyModuleFrame>} />
              <Route path="alerts" element={<DashboardAlerts />} />
              <Route path="profile" element={<LegacyModuleFrame><StudentProfilePage /></LegacyModuleFrame>} />
              <Route path="resume" element={<LegacyModuleFrame><ResumeAnalyzerPage /></LegacyModuleFrame>} />
              <Route path="recommendations" element={<LegacyModuleFrame><RecommendationsPage /></LegacyModuleFrame>} />
              <Route path="messages" element={<LegacyModuleFrame><MessagesPage /></LegacyModuleFrame>} />
              <Route path="community" element={<DashboardHome />} />
              <Route path="events" element={<LegacyModuleFrame><EventsPage /></LegacyModuleFrame>} />
            </Route>

            {/* Alumni Portal (Feature Dashboard Integration) */}
            <Route path="/alumni" element={<RoleShell allowedRoles={["alumni"]} />}>
              <Route index element={<DashboardHome />} />
              <Route path="network" element={<DashboardNetwork />} />
              <Route path="jobs" element={<DashboardJobs />} />
              <Route path="mentor" element={<DashboardMentor />} />
              <Route path="mentorship" element={<LegacyModuleFrame><AlumniMentorshipPage /></LegacyModuleFrame>} />
              <Route path="alerts" element={<DashboardAlerts />} />
              <Route path="profile" element={<LegacyModuleFrame><AlumniProfilePage /></LegacyModuleFrame>} />
              <Route path="messages" element={<LegacyModuleFrame><MessagesPage /></LegacyModuleFrame>} />
              <Route path="community" element={<DashboardHome />} />
              <Route path="events" element={<LegacyModuleFrame><EventsPage /></LegacyModuleFrame>} />
            </Route>

            {/* Administrator Portal (Feature Dashboard Integration) */}
            <Route path="/admin" element={<RoleShell allowedRoles={["admin"]} />}>
              <Route index element={<DashboardHome />} />
              <Route path="network" element={<DashboardNetwork />} />
              <Route path="jobs" element={<DashboardJobs />} />
              <Route path="mentor" element={<DashboardMentor />} />
              <Route path="alerts" element={<DashboardAlerts />} />
              <Route path="profile" element={<LegacyModuleFrame><AdminDashboard /></LegacyModuleFrame>} />
              <Route path="overview" element={<LegacyModuleFrame><AdminDashboard /></LegacyModuleFrame>} />
              <Route path="alumni" element={<LegacyModuleFrame><AdminAlumniPage /></LegacyModuleFrame>} />
              <Route path="students" element={<LegacyModuleFrame><AdminStudentsPage /></LegacyModuleFrame>} />
              <Route path="import" element={<LegacyModuleFrame><AdminCsvImportPage /></LegacyModuleFrame>} />
              <Route path="moderation" element={<LegacyModuleFrame><AdminModerationPage /></LegacyModuleFrame>} />
              <Route path="messages" element={<LegacyModuleFrame><MessagesPage /></LegacyModuleFrame>} />
              <Route path="events" element={<LegacyModuleFrame><EventsPage /></LegacyModuleFrame>} />
            </Route>

            {/* Direct dashboard route aliases redirect to the logged-in role's portal */}
            <Route path="/dashboard" element={<RoleRedirect />} />
            <Route path="/network" element={<RoleRedirect suffix="/network" />} />
            <Route path="/jobs" element={<RoleRedirect suffix="/jobs" />} />
            <Route path="/mentor" element={<RoleRedirect suffix="/mentor" />} />
            <Route path="/alerts" element={<RoleRedirect suffix="/alerts" />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
