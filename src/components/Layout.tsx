import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { getInitials, roleLabels } from "../lib/utils";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊", roles: ["admin", "doctor", "nurse", "pharmacist", "receptionist", "lab Technician"] },
  { path: "/patients", label: "Patients", icon: "👤", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { path: "/doctors", label: "Doctors", icon: "🩺", roles: ["admin", "receptionist"] },
  { path: "/appointments", label: "Appointments", icon: "📅", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { path: "/records", label: "Medical Records", icon: "📋", roles: ["admin", "doctor", "nurse"] },
  { path: "/prescriptions", label: "Prescriptions", icon: "💊", roles: ["admin", "doctor", "nurse"] },
  { path: "/pharmacy", label: "Pharmacy", icon: "🏥", roles: ["admin", "pharmacist"] },
  { path: "/wards", label: "Wards", icon: "🏥", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { path: "/scheduling", label: "Scheduling", icon: "📅", roles: ["admin", "nurse"] },
  { path: "/vitals", label: "Vitals", icon: "💓", roles: ["admin", "doctor", "nurse"] },
  { path: "/lab", label: "Lab Results", icon: "🔬", roles: ["admin", "doctor", "nurse", "lab Technician"] },
  { path: "/devices", label: "Devices", icon: "🖥️", roles: ["admin"] },
  { path: "/billing", label: "Billing", icon: "💰", roles: ["admin", "receptionist"] },
  { path: "/reports", label: "Reports", icon: "📈", roles: ["admin", "doctor"] },
  { path: "/admin", label: "Administration", icon: "⚙️", roles: ["admin"] },
  { path: "/settings", label: "Settings", icon: "🔧", roles: ["admin", "doctor", "nurse", "pharmacist", "receptionist", "lab Technician"] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => hasRole(...item.roles));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out ${
          mobileOpen ? "fixed inset-y-0 left-0 z-50" : "hidden lg:flex"
        }`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            CM
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm leading-tight">Clinic Manager</h1>
              <p className="text-xs text-slate-400">Hospital System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white font-medium"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-slate-700">
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user ? getInitials(user.name) : "?"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role ? roleLabels[user.role] || user.role : ""}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`mt-2 w-full px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ${
              sidebarOpen ? "" : "px-0 text-center"
            }`}
          >
            {sidebarOpen ? "Sign Out" : "🚪"}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            ☰
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 rounded-lg hover:bg-slate-100"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800">
              {navItems.find((n) => location.pathname.startsWith(n.path))?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
              {user ? getInitials(user.name) : ""}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
