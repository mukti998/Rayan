import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";

export default function Devices() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    deviceName: "", deviceType: "", serialNumber: "", department: "",
    purchaseDate: "", ipAddress: "", notes: "",
  });

  const devices = useQuery(api.devices.list, {
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const deviceStats = useQuery(api.devices.stats);
  const createDevice = useMutation(api.devices.create);
  const approveDevice = useMutation(api.devices.approve);
  const rejectDevice = useMutation(api.devices.reject);
  const updateDevice = useMutation(api.devices.update);
  const deleteDevice = useMutation(api.devices.remove);

  const isAdmin = user?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createDevice({
        deviceName: formData.deviceName,
        deviceType: formData.deviceType,
        serialNumber: formData.serialNumber,
        department: formData.department || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        ipAddress: formData.ipAddress || undefined,
        notes: formData.notes || undefined,
        callerRole: user?.role,
        callerId: user?.userId,
        callerName: user?.name,
      });
      setShowCreate(false);
      setFormData({ deviceName: "", deviceType: "", serialNumber: "", department: "", purchaseDate: "", ipAddress: "", notes: "" });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleApprove = async (deviceId: string) => {
    try {
      await approveDevice({
        id: deviceId as any,
        approvedBy: user?.name || "Admin",
        callerRole: user?.role,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (deviceId: string) => {
    const reason = prompt("Reason for rejection (optional):");
    try {
      await rejectDevice({
        id: deviceId as any,
        reason: reason || undefined,
        callerRole: user?.role,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateDevice({ id: id as any, status: status as any, callerRole: user?.role });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this device?")) {
      await deleteDevice({ id: id as any, callerRole: user?.role });
    }
  };

  // Count pending approvals
  const pendingDevices = devices?.filter((d) => d.status === "inactive") || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Device Management</h1>
          <p className="text-sm text-slate-500">Register, approve, and manage hospital devices</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            {showCreate ? "Close" : "+ Register Device"}
          </button>
        )}
      </div>

      {/* Pending approval alert for admins */}
      {isAdmin && pendingDevices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-amber-800 font-semibold flex items-center gap-2">
            <span>⏳</span> Pending Approval ({pendingDevices.length} device(s) awaiting approval)
          </h3>
          <div className="mt-3 space-y-2">
            {pendingDevices.map((d) => (
              <div key={d._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                <div>
                  <p className="font-medium text-slate-800">{d.deviceName}</p>
                  <p className="text-sm text-slate-500">{d.deviceType} • {d.serialNumber} • {d.department || "No department"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(String(d._id))}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                    ✓ Approve
                  </button>
                  <button onClick={() => handleReject(String(d._id))}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium">
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {deviceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-800">{deviceStats.total}</p>
            <p className="text-xs text-slate-500">Total Devices</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-emerald-600">{deviceStats.active}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{deviceStats.maintenance}</p>
            <p className="text-xs text-slate-500">Maintenance</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-amber-600">{deviceStats.inactive}</p>
            <p className="text-xs text-slate-500">Pending/Inactive</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">Register New Device</h3>
          <p className="text-sm text-amber-600 mb-3">⚠️ New devices are registered as "Inactive" and require admin approval before they can be activated.</p>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Device Name *" value={formData.deviceName}
              onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" required />
            <input type="text" placeholder="Device Type *" value={formData.deviceType}
              onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" required />
            <input type="text" placeholder="Serial Number *" value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" required />
            <input type="text" placeholder="Department" value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="text" placeholder="IP Address" value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="date" placeholder="Purchase Date" value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg" />
            <div className="flex justify-end md:col-span-2">
              <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                Register Device (Pending Approval)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Pending/Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Devices list */}
      {devices === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No devices found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Type</th>
                <th>Serial #</th>
                <th>Department</th>
                <th>IP Address</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d._id} className={d.status === "inactive" ? "bg-amber-50" : ""}>
                  <td className="font-medium">{d.deviceName}</td>
                  <td className="text-sm">{d.deviceType}</td>
                  <td className="text-sm font-mono">{d.serialNumber}</td>
                  <td className="text-sm">{d.department || "—"}</td>
                  <td className="text-sm font-mono">{d.ipAddress || "—"}</td>
                  <td>
                    <span className={`badge badge-${d.status}`}>{d.status}</span>
                    {d.approvedBy && (
                      <span className="text-xs text-slate-400 ml-1">by {d.approvedBy}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-1">
                        {d.status === "inactive" && (
                          <>
                            <button onClick={() => handleApprove(String(d._id))}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                            <button onClick={() => handleReject(String(d._id))}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                          </>
                        )}
                        {d.status === "maintenance" && (
                          <button onClick={() => handleStatusChange(String(d._id), "active")}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Restore</button>
                        )}
                        {d.status === "active" && (
                          <button onClick={() => handleStatusChange(String(d._id), "maintenance")}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Maint.</button>
                        )}
                        <button onClick={() => handleDelete(String(d._id))}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
