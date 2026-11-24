import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Sparkles,
  Upload,
  UserCheck,
  UserCircle,
  Users,
  ShieldCheck,
  X,
  BarChart3,
  Handshake,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apiClient";
import { supabase } from "../services/supabaseClient";
import { Avatar } from "../components/app/UI";
import "../styles/dashboard.css";

const NAV_BY_ROLE = {
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/student/profile", label: "My Profile", icon: UserCircle },
    { to: "/student/resume", label: "Resume Analyzer", icon: FileText },
    { to: "/student/recommendations", label: "Smart Matches", icon: Sparkles },
    { to: "/student/alumni", label: "Alumni Directory", icon: Users },
    { to: "/student/mentorship", label: "Mentorship", icon: Handshake },
    { to: "/student/messages", label: "Messages", icon: MessageSquare },
    { to: "/student/jobs", label: "Jobs & Internships", icon: Briefcase },
    { to: "/student/community", label: "Community", icon: Users },
    { to: "/student/events", label: "Events", icon: Calendar },
  ],
  alumni: [
    { to: "/alumni", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/alumni/profile", label: "Professional Profile", icon: UserCircle },
    { to: "/alumni/mentorship", label: "Mentorship Requests", icon: Handshake },
    { to: "/alumni/messages", label: "Messages", icon: MessageSquare },
    { to: "/alumni/jobs", label: "Post Opportunities", icon: Briefcase },
    { to: "/alumni/community", label: "Community & Advice", icon: Users },
    { to: "/alumni/events", label: "University Events", icon: Calendar },
  ],
  admin: [
    { to: "/admin", label: "Overview & Analytics", icon: BarChart3, end: true },
    { to: "/admin/alumni", label: "Alumni & Verification", icon: UserCheck },
    { to: "/admin/students", label: "Students & Roles", icon: ShieldCheck },
    { to: "/admin/import", label: "CSV Bulk Import", icon: Upload },
    { to: "/admin/moderation", label: "Post Moderation", icon: MessageSquare },
    { to: "/admin/events", label: "Event Management", icon: Calendar },
  ],
};

export default function DashboardLayout({ children }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = NAV_BY_ROLE[profile?.role] || NAV_BY_ROLE.student;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get("/notifications");
        if (!active) return;
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      } catch {
        // silent
      }
    }
    load();
    if (!supabase || !profile?.id) return () => { active = false; };

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const roleBadgeLabel =
    profile?.role === "admin" ? "Administrator" : profile?.role === "alumni" ? "Alumni" : "Student";

  return (
    <div id="alumsync-app" className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-100 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5 text-white no-underline">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-display font-extrabold text-xs">
              AS
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight">
              Alum<span className="text-brand-400">Sync</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800/80">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-600/20 text-brand-300 text-xs font-semibold">
            {roleBadgeLabel} Portal
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                    isActive
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/70 no-underline"
          >
            <Home className="w-4 h-4" />
            <span>Landing Home</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-500 hidden sm:inline">
              Welcome back, <strong className="text-slate-900">{profile?.full_name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3.5 cursor-pointer hover:bg-slate-50 ${
                          !n.is_read ? "bg-brand-50/40" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <Avatar name={profile?.full_name} src={profile?.avatar_url} size="sm" />
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-[11px] text-slate-500 capitalize">{profile?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
