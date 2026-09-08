import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDateTime, roleLabels, roleColors } from "../lib/utils";

export default function Admin() {
  const { user, sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "ip">("users");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [formError, setFormError] = useState("");

  const [newUser, setNewUser] = useState({
    username: "", password: "", name: "", email: "", role: "receptionist" as any, department: "", phone: "",
  });

  const users = useQuery(api.users.list, {});
  const userCounts = useQuery(api.users.counts);
  const auditLogs = useQuery(api.audit.list, { limit: 100 });
  const ipList = useQuery(api.audit.listIPs);
  const createUser = useMutation(api.auth.register);
  const toggleUser = useMutation(api.users.toggleActive);
  const deleteUser = useMutation(api.users.remove);
  const addIP = useMutation(api.audit.addIP);
  const toggleIP = useMutation(api.audit.toggleIP);
  const removeIP = useMutation(api.audit.removeIP);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createUser({
        username: newUser.username,
        password: newUser.password,
        name: newUser.name,
        email: newUser.email || undefined,
        role: newUser.role,
        department: newUser.department || undefined,
        phone: newUser.phone || undefined,
        sessionToken: sessionToken || "",
      });
      setShowCreateUser(false);
      setNewUser({ username: "", password: "", name: "", email: "", role: "receptionist", department: "", phone: "" });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleAddIP = async () => {
    const ip = prompt("Enter IP address:");
    const label = prompt("Enter label (e.g. 'Front Desk'):");
    if (ip && label) {
      await addIP({ ipAddress: ip, label, addedBy: user?.username || "admin", sessionToken: sessionToken || "" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
        <p className="text-sm text-slate-500">Manage users, security, and system settings</p>
      </div>

      {/* Stats */}
      {userCounts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-800">{userCounts.total}</p>
            <p className="text-xs text-slate-500">Total Users</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{userCounts.doctors}</p>
            <p className="text-xs text-slate-500">Doctors</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{userCounts.nurses}</p>
            <p className="text-xs text-slate-500">Nurses</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{userCounts.pharmacists}</p>
            <p className="text-xs text-slate-500">Pharmacists</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["users", "audit", "ip"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
            }`}>
            {tab === "users" ? "User Management" : tab === "audit" ? "Audit Log" : "IP Allowlist"}
          </button>
        ))}
      </div>

      {/* User Management */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateUser(!showCreateUser)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
              {showCreateUser ? "Close" : "+ Create User"}
            </button>
          </div>

          {showCreateUser && (
            <div className="card animate-slideIn">
              <h3 className="font-semibold text-slate-800 mb-4">Create New User</h3>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
              )}
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Username *" value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg" required />
                <input type="password" placeholder="Password *" value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg" required />
                <input type="text" placeholder="Full Name *" value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg" required />
                <input type="email" placeholder="Email" value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab Technician">Lab Technician</option>
                  <option value="admin">Admin</option>
                </select>
                <input type="text" placeholder="Department" value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg" />
                <div className="flex justify-end md:col-span-2">
                  <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          )}

          {users === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="font-medium">{u.name}</td>
                      <td className="text-sm font-mono">{u.username}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || "bg-gray-100"}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="text-sm">{u.department || "—"}</td>
                      <td>
                        <span className={`badge ${u.active ? "badge-active" : "badge-inactive"}`}>
                          {u.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {u.username !== "admin" && (
                            <>
                              <button onClick={() => toggleUser({ id: u._id as any, active: !u.active, sessionToken: sessionToken || "" })}
                                className={`text-xs px-2 py-1 rounded ${u.active ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                {u.active ? "Disable" : "Enable"}
                              </button>
                              <button onClick={() => { if (confirm("Delete this user?")) deleteUser({ id: u._id as any, sessionToken: sessionToken || "" }); }}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === "audit" && (
        <div>
          {auditLogs === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No audit logs yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-sm">{formatDateTime(log.timestamp)}</td>
                      <td className="text-sm font-medium">{log.userName}</td>
                      <td className="text-sm">{log.action}</td>
                      <td className="text-sm">{log.target}</td>
                      <td className="text-sm text-slate-500 max-w-[300px] truncate">{log.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* IP Allowlist */}
      {activeTab === "ip" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleAddIP}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
              + Add IP
            </button>
          </div>
          {ipList === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ipList.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No IP restrictions configured</p>
              <p className="text-sm text-slate-500 mt-1">All IPs are allowed by default</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Label</th>
                    <th>Added By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipList.map((ip) => (
                    <tr key={ip._id}>
                      <td className="font-mono text-sm">{ip.ipAddress}</td>
                      <td className="text-sm">{ip.label}</td>
                      <td className="text-sm">{ip.addedBy}</td>
                      <td>
                        <span className={`badge ${ip.active ? "badge-active" : "badge-inactive"}`}>
                          {ip.active ? "Allowed" : "Blocked"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => toggleIP({ id: ip._id as any, active: !ip.active, sessionToken: sessionToken || "" })}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {ip.active ? "Block" : "Allow"}
                          </button>
                          <button onClick={() => removeIP({ id: ip._id as any, sessionToken: sessionToken || "" })}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
