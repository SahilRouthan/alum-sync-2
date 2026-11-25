import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { UserProvider } from "../context/UserContext";
import Navbar from "./layout/Navbar";
import Sidebar from "./layout/Sidebar";
import BackendStatus from "./BackendStatus";
import "../../styles/dashboard.css";

function DashboardFrame() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div id="alumsync-app" className={`alumsync-app ${theme === "light" ? "light" : "dark"}`}>
      <div className="min-h-screen bg-bg-main text-text-main flex flex-col">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <BackendStatus />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 min-w-0 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegacyModuleFrame({ children }) {
  return (
    <div className="max-w-[1150px] mx-auto px-4 sm:px-6 py-6">
      <div className="rounded-[24px] bg-slate-50 text-slate-900 p-4 sm:p-6 shadow-card-deep border border-slate-200">
        {children}
      </div>
    </div>
  );
}

export default function FeatureDashboardShell() {
  return (
    <ThemeProvider>
      <UserProvider>
        <DashboardFrame />
      </UserProvider>
    </ThemeProvider>
  );
}
