import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";

export default function Appointments() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    doctorId: "",
    doctorName: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    reason: "",
  });

  const appointments = useQuery(api.appointments.list, {
    date: dateFilter || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const patients = useQuery(api.patients.list, {});
  const doctors = useQuery(api.doctors.list, {});
  const createAppointment = useMutation(api.appointments.create);
  const updateStatus = useMutation(api.appointments.updateStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createAppointment({
        ...formData,
        createdBy: user?.username || "unknown",
      });
      setShowCreate(false);
      setFormData({
        patientId: "", patientName: "", doctorId: "", doctorName: "",
        date: new Date().toISOString().split("T")[0], time: "09:00", reason: "",
      });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus({ id: id as any, status: status as any });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePatientChange = (pid: string) => {
    const p = patients?.find((pt) => pt.patientId === pid);
    setFormData({ ...formData, patientId: pid, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
  };

  const handleDoctorChange = (did: string) => {
    const d = doctors?.find((doc) => String(doc._id) === did);
    setFormData({ ...formData, doctorId: did, doctorName: d?.name || "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500">Schedule and manage patient appointments</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          {showCreate ? "Close" : "+ New Appointment"}
        </button>
      </div>

      {showCreate && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">Schedule Appointment</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
              <select value={formData.patientId} onChange={(e) => handlePatientChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required>
                <option value="">Select Patient</option>
                {patients?.map((p) => (
                  <option key={p._id} value={p.patientId}>{p.firstName} {p.lastName} ({p.patientId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Doctor *</label>
              <select value={formData.doctorId} onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required>
                <option value="">Select Doctor</option>
                {doctors?.filter((d) => d.available).map((d) => (
                  <option key={d._id} value={String(d._id)}>{d.name} - {d.specialization}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Reason for visit" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Schedule Appointment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments list */}
      {appointments === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No appointments found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a._id}>
                  <td className="font-medium">{a.patientName}</td>
                  <td>{a.doctorName}</td>
                  <td>{a.date} {a.time}</td>
                  <td className="text-sm text-slate-600">{a.reason || "—"}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {a.status === "scheduled" && (
                        <button onClick={() => handleStatusChange(String(a._id), "confirmed")}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Confirm</button>
                      )}
                      {a.status === "confirmed" && (
                        <button onClick={() => handleStatusChange(String(a._id), "in-progress")}
                          className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">Start</button>
                      )}
                      {(a.status === "scheduled" || a.status === "confirmed") && (
                        <button onClick={() => handleStatusChange(String(a._id), "cancelled")}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Cancel</button>
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
  );
}
