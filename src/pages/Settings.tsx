import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { roleLabels } from "../lib/utils";

export default function Settings() {
  const { user, sessionToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "system">("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const changePassword = useMutation(api.auth.changePassword);
  const seedDatabase = useMutation(api.seed.seedDatabase);
  const resetDatabase = useMutation(api.seed.resetDatabase);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      await changePassword({
        sessionToken: sessionToken || "",
        currentPassword,
        newPassword,
      });
      setMessage("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetDatabase = async () => {
    if (confirm("WARNING: This will delete ALL data. Are you absolutely sure?")) {
      if (confirm("FINAL WARNING: This cannot be undone. Type 'yes' mentally and click OK to proceed.")) {
        try {
          await resetDatabase({ sessionToken: sessionToken || "" });
          alert("Database has been reset. Please log in again.");
          logout();
        } catch (err: any) {
          alert(err.message);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account and system settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["profile", "password", "system"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
            }`}>
            {tab === "system" ? "System" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === "profile" && (
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-slate-800 mb-4">Your Profile</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center text-2xl font-bold">
                {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-800">{user?.name}</h4>
                <p className="text-sm text-slate-500">@{user?.username}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 bg-teal-100 text-teal-700`}>
                  {user?.role ? roleLabels[user.role] || user.role : ""}
                </span>
              </div>
            </div>
            <InfoRow label="Username" value={user?.username || ""} />
            <InfoRow label="Name" value={user?.name || ""} />
            <InfoRow label="Role" value={user?.role ? roleLabels[user.role] || user.role : ""} />
            <InfoRow label="Department" value={user?.department || "Not assigned"} />
          </div>
        </div>
      )}

      {/* Password */}
      {activeTab === "password" && (
        <div className="card max-w-2xl">
          <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
            </div>
            <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* System */}
      {activeTab === "system" && (
        <div className="space-y-6 max-w-2xl">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">System Information</h3>
            <div className="space-y-3">
              <InfoRow label="System" value="Clinic Manager Pro" />
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Database" value="Convex (Offline-capable)" />
              <InfoRow label="Storage" value="Local Device" />
              <InfoRow label="Status" value="Operational" />
            </div>
          </div>

          <div className="card border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-4">Demo Database</h3>
            <p className="text-sm text-slate-600 mb-4">
              Re-initialize the database with demo data. This will add sample patients, doctors, medications, and devices.
            </p>
            <button onClick={async () => {
              try { const r = await seedDatabase(); alert(r); } catch (e: any) { alert(e.message); }
            }} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
              Re-Seed Demo Data
            </button>
          </div>

          <div className="card border-red-200">
            <h3 className="font-semibold text-red-800 mb-4">⚠️ Danger Zone</h3>
            <p className="text-sm text-slate-600 mb-4">
              Reset the entire database. This will permanently delete ALL data including patients, records, and users.
            </p>
            <button onClick={handleResetDatabase}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
              Reset Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}
