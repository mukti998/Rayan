import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

type Tab = "overview" | "admissions" | "beds";

export default function Wards() {
  const { user, sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showAdmit, setShowAdmit] = useState(false);
  const [showAddBed, setShowAddBed] = useState(false);
  const [wardFilter, setWardFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const bedStats = useQuery(api.wards.bedStats);
  const beds = useQuery(api.wards.listBeds, {
    ward: wardFilter !== "all" ? wardFilter : undefined,
  });
  const admissions = useQuery(api.wards.listAdmissions, {
    status: "all",
    ward: wardFilter !== "all" ? wardFilter : undefined,
  });
  const patients = useQuery(api.patients.list, {});
  const doctors = useQuery(api.doctors.list, {});

  const admitPatient = useMutation(api.wards.admitPatient);
  const dischargePatient = useMutation(api.wards.dischargePatient);
  const createBed = useMutation(api.wards.createBed);
  const updateBed = useMutation(api.wards.updateBed);
  const removeBed = useMutation(api.wards.removeBed);

  // Admit form
  const [admitForm, setAdmitForm] = useState({
    patientId: "",
    patientName: "",
    ward: "",
    bedId: "",
    bedNumber: "",
    diagnosis: "",
    doctorName: "",
    notes: "",
  });

  // Add bed form
  const [bedForm, setBedForm] = useState({
    bedNumber: "",
    ward: "",
    bedType: "general" as "general" | "semi-private" | "private" | "icu",
  });

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!admitForm.patientId || !admitForm.ward) {
      setFormError("Patient and ward are required");
      return;
    }
    try {
      await admitPatient({
        patientId: admitForm.patientId,
        patientName: admitForm.patientName,
        ward: admitForm.ward,
        bedId: admitForm.bedId ? (admitForm.bedId as any) : undefined,
        bedNumber: admitForm.bedNumber || undefined,
        diagnosis: admitForm.diagnosis || undefined,
        doctorName: admitForm.doctorName || undefined,
        notes: admitForm.notes || undefined,
        sessionToken: sessionToken || "",
      });
      setShowAdmit(false);
      setAdmitForm({
        patientId: "",
        patientName: "",
        ward: "",
        bedId: "",
        bedNumber: "",
        diagnosis: "",
        doctorName: "",
        notes: "",
      });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDischarge = async (admissionId: string) => {
    if (!confirm("Discharge this patient?")) return;
    try {
      await dischargePatient({
        admissionId: admissionId as any,
        sessionToken: sessionToken || "",
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBed({
        bedNumber: bedForm.bedNumber,
        ward: bedForm.ward,
        bedType: bedForm.bedType,
        sessionToken: sessionToken || "",
      });
      setShowAddBed(false);
      setBedForm({ bedNumber: "", ward: "", bedType: "general" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBed = async (bedId: string) => {
    if (!confirm("Remove this bed?")) return;
    try {
      await removeBed({
        id: bedId as any,
        sessionToken: sessionToken || "",
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeAdmissions =
    admissions?.filter((a) => a.status === "active") || [];
  const wards = bedStats?.map((s) => s.ward) || [];
  const allWards = [...new Set([...wards, ...beds?.map((b) => b.ward) || []])].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ward & Bed Management
          </h1>
          <p className="text-sm text-slate-500">
            Patient admissions, bed allocation, and discharge
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && (
            <button
              onClick={() => setShowAddBed(!showAddBed)}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              {showAddBed ? "Close" : "+ Add Bed"}
            </button>
          )}
          <button
            onClick={() => setShowAdmit(!showAdmit)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            {showAdmit ? "Close" : "+ Admit Patient"}
          </button>
        </div>
      </div>

      {/* Add Bed Form */}
      {showAddBed && user?.role === "admin" && (
        <div className="card animate-slideIn border-l-4 border-l-emerald-400">
          <h3 className="font-semibold text-slate-800 mb-4">Add New Bed</h3>
          <form onSubmit={handleAddBed} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Bed Number (e.g. A-101)"
              value={bedForm.bedNumber}
              onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Ward (e.g. General Medicine)"
              value={bedForm.ward}
              onChange={(e) => setBedForm({ ...bedForm, ward: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
            <select
              value={bedForm.bedType}
              onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value as any })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="general">General</option>
              <option value="semi-private">Semi-Private</option>
              <option value="private">Private</option>
              <option value="icu">ICU</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              Add Bed
            </button>
          </form>
        </div>
      )}

      {/* Admit Patient Form */}
      {showAdmit && (
        <div className="card animate-slideIn border-l-4 border-l-indigo-400">
          <h3 className="font-semibold text-slate-800 mb-4">
            Admit Patient
          </h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleAdmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Patient *
              </label>
              <select
                value={admitForm.patientId}
                onChange={(e) => {
                  const p = patients?.find((pt) => pt.patientId === e.target.value);
                  setAdmitForm({
                    ...admitForm,
                    patientId: e.target.value,
                    patientName: p ? `${p.firstName} ${p.lastName}` : "",
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              >
                <option value="">Select Patient</option>
                {patients
                  ?.filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p._id} value={p.patientId}>
                      {p.firstName} {p.lastName} ({p.patientId})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ward *
              </label>
              <select
                value={admitForm.ward}
                onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              >
                <option value="">Select Ward</option>
                {allWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bed (optional)
              </label>
              <select
                value={admitForm.bedId}
                onChange={(e) => {
                  const bed = beds?.find((b) => String(b._id) === e.target.value);
                  setAdmitForm({
                    ...admitForm,
                    bedId: e.target.value,
                    bedNumber: bed?.bedNumber || "",
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">No bed assignment</option>
                {beds
                  ?.filter((b) => b.status === "available" && (!admitForm.ward || b.ward === admitForm.ward))
                  .map((b) => (
                    <option key={b._id} value={String(b._id)}>
                      {b.bedNumber} ({b.ward} — {b.bedType})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attending Doctor
              </label>
              <select
                value={admitForm.doctorName}
                onChange={(e) => setAdmitForm({ ...admitForm, doctorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Doctor</option>
                {doctors?.map((d) => (
                  <option key={d._id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Diagnosis
              </label>
              <input
                type="text"
                value={admitForm.diagnosis}
                onChange={(e) => setAdmitForm({ ...admitForm, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Admission diagnosis"
              />
            </div>
            <div className="flex justify-end md:col-span-3">
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Admit Patient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs + Ward Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {(["overview", "admissions", "beds"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "bg-white text-slate-800 shadow"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {tab === "overview" ? "Ward Overview" : tab === "admissions" ? `Admissions (${activeAdmissions.length})` : "Bed Registry"}
            </button>
          ))}
        </div>
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Wards</option>
          {allWards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {/* Ward Overview */}
      {activeTab === "overview" && (
        <div>
          {bedStats === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bedStats.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No wards configured</p>
              <p className="text-slate-500 text-sm mt-1">
                Add beds to set up ward management
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bedStats.map((ws) => (
                <div key={ws.ward} className="card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-slate-800 mb-3">
                    {ws.ward}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-green-50 rounded-lg p-2">
                      <p className="text-xl font-bold text-green-600">{ws.available}</p>
                      <p className="text-xs text-green-600">Available</p>
                    </div>
                    <div className="text-center bg-blue-50 rounded-lg p-2">
                      <p className="text-xl font-bold text-blue-600">{ws.occupied}</p>
                      <p className="text-xs text-blue-600">Occupied</p>
                    </div>
                    <div className="text-center bg-amber-50 rounded-lg p-2">
                      <p className="text-xl font-bold text-amber-600">{ws.maintenance}</p>
                      <p className="text-xs text-amber-600">Maint.</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${ws.total > 0 ? (ws.occupied / ws.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    {ws.occupied}/{ws.total} beds occupied
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Admissions */}
      {activeTab === "admissions" && (
        <div>
          {admissions === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : admissions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No admissions found</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Ward</th>
                    <th>Bed</th>
                    <th>Admitted</th>
                    <th>Doctor</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a._id}>
                      <td className="font-medium">{a.patientName}</td>
                      <td className="text-sm">{a.ward}</td>
                      <td className="text-sm font-mono">{a.bedNumber || "—"}</td>
                      <td className="text-sm">{formatDate(a.admissionDate)}</td>
                      <td className="text-sm">{a.doctorName || "—"}</td>
                      <td className="text-sm text-slate-600 max-w-[200px] truncate">
                        {a.diagnosis || "—"}
                      </td>
                      <td>
                        <span className={`badge badge-${a.status === "active" ? "active" : a.status === "discharged" ? "discharged" : "scheduled"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.status === "active" && (
                          <button
                            onClick={() => handleDischarge(String(a._id))}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Discharge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bed Registry */}
      {activeTab === "beds" && (
        <div>
          {beds === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : beds.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No beds registered</p>
              <p className="text-slate-500 text-sm mt-1">
                Click "Add Bed" to register beds for each ward
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Bed #</th>
                    <th>Ward</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Patient</th>
                    {user?.role === "admin" && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {beds.map((b) => (
                    <tr key={b._id}>
                      <td className="font-mono font-medium">{b.bedNumber}</td>
                      <td className="text-sm">{b.ward}</td>
                      <td className="text-sm capitalize">{b.bedType}</td>
                      <td>
                        <span
                          className={`badge ${
                            b.status === "available"
                              ? "badge-active"
                              : b.status === "occupied"
                              ? "badge-maintenance"
                              : "badge-inactive"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="text-sm">{b.currentPatientId || "—"}</td>
                      {user?.role === "admin" && (
                        <td>
                          <div className="flex gap-1">
                            {b.status !== "occupied" && (
                              <button
                                onClick={() =>
                                  updateBed({
                                    id: b._id,
                                    status: b.status === "maintenance" ? "available" : "maintenance",
                                    sessionToken: sessionToken || "",
                                  })
                                }
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                              >
                                {b.status === "maintenance" ? "Restore" : "Maint."}
                              </button>
                            )}
                            {b.status !== "occupied" && (
                              <button
                                onClick={() => handleDeleteBed(String(b._id))}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                              >
                                Remove
                              </button>
                            )}
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
      )}
    </div>
  );
}
