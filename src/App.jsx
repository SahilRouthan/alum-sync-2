import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/app/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import ResumeAnalyzerPage from "./pages/student/ResumeAnalyzerPage";
import RecommendationsPage from "./pages/student/RecommendationsPage";
import AlumniDirectoryPage from "./pages/student/AlumniDirectoryPage";
import StudentMentorshipPage from "./pages/student/StudentMentorshipPage";

import AlumniDashboard from "./pages/alumni/AlumniDashboard";
import AlumniProfilePage from "./pages/alumni/AlumniProfilePage";
import AlumniMentorshipPage from "./pages/alumni/AlumniMentorshipPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlumniPage from "./pages/admin/AdminAlumniPage";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminCsvImportPage from "./pages/admin/AdminCsvImportPage";
import AdminModerationPage from "./pages/admin/AdminModerationPage";

import CommunityPage from "./pages/shared/CommunityPage";
import EventsPage from "./pages/shared/EventsPage";
import JobsPage from "./pages/shared/JobsPage";
import MessagesPage from "./pages/shared/MessagesPage";

function RoleShell({ allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
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

            {/* Student Dashboard & Modules */}
            <Route path="/student" element={<RoleShell allowedRoles={["student"]} />}>
              <Route index element={<StudentDashboard />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="resume" element={<ResumeAnalyzerPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="alumni" element={<AlumniDirectoryPage />} />
              <Route path="mentorship" element={<StudentMentorshipPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="events" element={<EventsPage />} />
            </Route>

            {/* Alumni Dashboard & Modules */}
            <Route path="/alumni" element={<RoleShell allowedRoles={["alumni"]} />}>
              <Route index element={<AlumniDashboard />} />
              <Route path="profile" element={<AlumniProfilePage />} />
              <Route path="mentorship" element={<AlumniMentorshipPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="events" element={<EventsPage />} />
            </Route>

            {/* Administrator Dashboard & Modules */}
            <Route path="/admin" element={<RoleShell allowedRoles={["admin"]} />}>
              <Route index element={<AdminDashboard />} />
              <Route path="alumni" element={<AdminAlumniPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="import" element={<AdminCsvImportPage />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="events" element={<EventsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
