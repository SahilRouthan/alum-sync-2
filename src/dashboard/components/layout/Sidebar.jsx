import { useContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useAuth } from "../../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { userData, notifications, basePath } = useContext(UserContext);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const menuItems = [
    { name: "Home Feed", path: `${basePath}`, end: true },
    { name: "My Profile", path: `${basePath}/profile` },
    { name: "Alumni Directory", path: `${basePath}/network` },
    { name: "Jobs & Internships", path: `${basePath}/jobs` },
    { name: "Messages", path: `${basePath}/messages` },
    { name: "Mentorship", path: `${basePath}/mentor` },
    { name: "Events & Reunions", path: `${basePath}/events` },
    { name: "Alerts", path: `${basePath}/alerts`, dynamicBadge: true },
    ...(userData?.portalRole === "student"
      ? [{ name: "Resume Analyzer", path: `${basePath}/resume` }]
      : []),
    ...(userData?.portalRole === "admin"
      ? [
          { name: "Admin Overview", path: `${basePath}/overview` },
          { name: "Verify Alumni", path: `${basePath}/alumni` },
          { name: "CSV Import", path: `${basePath}/import` },
          { name: "Moderation", path: `${basePath}/moderation` },
        ]
      : []),
  ];

  const handleLogout = async () => {
    onClose?.();
    await logout();
    navigate("/");
  };

  const renderContent = () => {
    if (!userData) return null;

    return (
      <div className="flex flex-col gap-4">
        {/* Profile Card */}
        <Link
          to={`${basePath}/profile`}
          onClick={onClose}
          className="as-card overflow-hidden block transition-transform hover:scale-[1.01] active:scale-[0.99] no-underline"
        >
          <div className="h-14 bg-gradient-to-r from-primary to-primary-soft"></div>
          <div className="px-4 pb-5 -mt-7 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-card-bg p-1 shadow-lg">
              <div className="w-full h-full rounded-full bg-accent flex items-center justify-center text-primary-soft font-bold text-lg border-2 border-card-bg">
                {userData.avatar}
              </div>
            </div>
            <h2 className="mt-2 font-sora text-base leading-tight text-text-main">{userData.name}</h2>
            <p className="text-text-muted text-[11px] font-medium mt-1">{userData.role}</p>
            <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">{userData.university}</p>

            <div className="w-full h-[1px] bg-border-subtle my-3"></div>

            <div className="flex justify-between w-full px-2">
              <div className="text-left">
                <p className="text-[10px] text-text-muted font-bold uppercase">Connections</p>
                <p className="text-primary-violet font-bold">{userData.stats.connections}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-muted font-bold uppercase">Views</p>
                <p className="text-primary-violet font-bold">{userData.stats.profileViews}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Navigate Menu */}
        <div className="as-card p-4">
          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 px-2">Navigate</h3>
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const badgeValue = item.dynamicBadge ? unreadCount : item.badge;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm no-underline ${
                      isActive
                        ? "nav-active shadow-sm"
                        : "text-text-muted hover:bg-hover-bg"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`w-2 h-2 rounded-full transition-all ${
                          isActive ? "bg-primary-violet scale-110" : "bg-border-subtle"
                        }`}
                      ></div>
                      <span className="flex-1">{item.name}</span>
                      {!!badgeValue && (
                        <span className="bg-primary-violet text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {badgeValue}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="w-full h-[1px] bg-border-subtle my-3"></div>

          <div className="flex flex-col gap-1">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:bg-hover-bg transition-all no-underline"
            >
              <span>Landing Home</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-hover-bg transition-all text-left"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop — persistent from md up */}
      <aside className="hidden md:block md:w-[240px] md:flex-shrink-0 md:h-[calc(100vh-70px)] md:sticky md:top-[70px] md:overflow-y-auto no-scrollbar p-4">
        {renderContent()}
      </aside>

      {/* Mobile — drawer */}
      {isOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
          <aside className="md:hidden fixed top-[70px] left-0 bottom-0 w-[280px] max-w-[85vw] bg-card-bg border-r border-border-subtle z-50 overflow-y-auto no-scrollbar p-4 shadow-xl">
            {renderContent()}
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
