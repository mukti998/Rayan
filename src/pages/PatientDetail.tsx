import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

type HistoryTab = "overview" | "appointments" | "vitals" | "records" | "prescriptions" | "admissions";

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user, sessionToken } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [activeTab, setActiveTab] = useState<HistoryTab>("overview");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const patient = useQuery(api.patients.get, { patientId: patientId || "" });
  const records = useQuery(
    api.medicalRecords.patientHistory,
    patientId ? { patientId } : "skip"
  );
  const patientPrescriptions = useQuery(
    api.prescriptions.list,
    patientId ? { patientId } : "skip"
  );
  const patientAppointments = useQuery(
    api.appointments.list,
    patientId ? { patientId } : "skip"
  );
  const patientVitals = useQuery(
    api.vitals.patientVitals,
    patientId ? { patientId } : "skip"
  );
  const patientAdmissions = useQuery(
    api.wards.listAdmissions,
    patientId ? { patientId, status: "all" } : "skip"
  );

  const updatePatient = useMutation(api.patients.update);
  const deletePatient = useMutation(api.patients.remove);

  const isAdmin = user?.role === "admin";

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", address: "",
    bloodGroup: "", emergencyContact: "", emergencyPhone: "",
    insuranceProvider: "", insuranceNumber: "", notes: "", status: "" as string,
  });

  const startEdit = () => {
    if (!patient) return;
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email || "",
      address: patient.address,
      bloodGroup: patient.bloodGroup || "",
      emergencyContact: patient.emergencyContact || "",
      emergencyPhone: patient.emergencyPhone || "",
      insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber: patient.insuranceNumber || "",
      notes: patient.notes || "",
      status: patient.status,
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    setEditError("");
    try {
      await updatePatient({
        id: patient!._id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email || undefined,
        address: editForm.address,
        bloodGroup: editForm.bloodGroup || undefined,
        emergencyContact: editForm.emergencyContact || undefined,
        emergencyPhone: editForm.emergencyPhone || undefined,
        insuranceProvider: editForm.insuranceProvider || undefined,
        insuranceNumber: editForm.insuranceNumber || undefined,
        notes: editForm.notes || undefined,
        status: editForm.status as any,
        sessionToken: sessionToken || "",
      });
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    if (!patient) return;
    const expectedName = `${patient.firstName} ${patient.lastName}`;
    if (deleteConfirmName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      setDeleteError(`Type exactly "${expectedName}" to confirm deletion`);
      return;
    }
    try {
      await deletePatient({
        id: patient._id,
        confirmationName: deleteConfirmName.trim(),
        sessionToken: sessionToken || "",
      });
      navigate("/patients");
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  if (patient === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-500 text-lg">Patient not found</p>
        <button onClick={() => navigate("/patients")} className="mt-4 text-teal-600 hover:underline">
          Back to Patients
        </button>
      </div>
    );
  }

  const tabs: { key: HistoryTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "appointments", label: "Appointments", count: patientAppointments?.length },
    { key: "vitals", label: "Vitals", count: patientVitals?.length },
    { key: "records", label: "Medical Records", count: records?.length },
    { key: "prescriptions", label: "Prescriptions", count: patientPrescriptions?.length },
    { key: "admissions", label: "Admissions", count: patientAdmissions?.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={() => navigate("/patients")} className="p-2 hover:bg-slate-100 rounded-lg self-start">
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-slate-500">Patient ID: {patient.patientId}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge badge-${patient.status}`}>{patient.status}</span>
          <button onClick={startEdit}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
            Edit Patient
          </button>
          {isAdmin && (
            <button onClick={() => { setShowDeleteDialog(true); setDeleteConfirmName(""); setDeleteError(""); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Personal + Medical Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Personal Information</h3>
          <div className="space-y-3">
            <InfoRow label="Full Name" value={`${patient.firstName} ${patient.lastName}`} />
            <InfoRow label="Patient ID" value={patient.patientId} />
            <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Blood Group" value={patient.bloodGroup || "N/A"} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Email" value={patient.email || "N/A"} />
            <InfoRow label="Address" value={patient.address} />
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Medical Information</h3>
          <div className="space-y-3">
            <InfoRow label="Emergency Contact" value={patient.emergencyContact || "N/A"} />
            <InfoRow label="Emergency Phone" value={patient.emergencyPhone || "N/A"} />
            <InfoRow label="Insurance" value={patient.insuranceProvider || "N/A"} />
            <InfoRow label="Insurance #" value={patient.insuranceNumber || "N/A"} />
            <InfoRow label="Registered" value={formatDate(new Date(patient.registrationDate).toISOString())} />
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Allergies</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {patient.allergies.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}
          {patient.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Notes</p>
              <p className="text-sm text-slate-700 mt-1">{patient.notes}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Visit Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{records?.length || 0}</p>
              <p className="text-xs text-blue-500">Medical Records</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{patientPrescriptions?.length || 0}</p>
              <p className="text-xs text-purple-500">Prescriptions</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-rose-600">{patientVitals?.length || 0}</p>
              <p className="text-xs text-rose-500">Vitals</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{patientAppointments?.length || 0}</p>
              <p className="text-xs text-indigo-500">Appointments</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white text-slate-800 shadow"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-xs text-slate-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Recent Vitals */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Vitals</h3>
            {patientVitals === undefined ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : patientVitals.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No vitals recorded yet</p>
            ) : (
              <div className="space-y-3">
                {patientVitals.slice(0, 3).map((v) => (
                  <div key={v._id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500 w-32">{formatDate(new Date(v.timestamp).toISOString())}</span>
                    <span className="text-sm"><strong>BP:</strong> {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</span>
                    <span className="text-sm"><strong>HR:</strong> {v.heartRate}</span>
                    <span className="text-sm"><strong>Temp:</strong> {v.temperature}°C</span>
                    <span className="text-sm"><strong>SpO2:</strong> {v.oxygenSaturation}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Appointments */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Appointments</h3>
            {patientAppointments === undefined ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : patientAppointments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No appointments yet</p>
            ) : (
              <div className="space-y-3">
                {patientAppointments.slice(0, 5).map((a) => (
                  <div key={a._id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500 w-32">{a.date} {a.time}</span>
                    <span className="text-sm font-medium">{a.doctorName}</span>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                    {a.reason && <span className="text-sm text-slate-500 truncate">{a.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <div className="card">
          {patientAppointments === undefined ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : patientAppointments.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No appointments for this patient</p>
          ) : (
            <div className="space-y-3">
              {patientAppointments.map((a) => (
                <div key={a._id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{a.date} at {a.time}</span>
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                    </div>
                    <p className="text-sm text-slate-500">Dr. {a.doctorName}</p>
                    {a.reason && <p className="text-sm text-slate-600 mt-1">{a.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vitals Tab */}
      {activeTab === "vitals" && (
        <div className="card">
          {patientVitals === undefined ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : patientVitals.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No vitals recorded for this patient</p>
          ) : (
            <div className="space-y-3">
              {patientVitals.map((v) => {
                const isAbnormal = v.bloodPressureSystolic > 140 || v.bloodPressureDiastolic > 90 ||
                  v.heartRate > 100 || v.temperature > 37.8 || v.oxygenSaturation < 94;
                return (
                  <div key={v._id} className={`p-4 border rounded-lg ${isAbnormal ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">{formatDate(new Date(v.timestamp).toISOString())}</span>
                      <span className="text-xs text-slate-500">Recorded by {v.recordedBy}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                      <div><span className="text-slate-500">BP:</span> <span className="font-medium">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</span></div>
                      <div><span className="text-slate-500">HR:</span> <span className="font-medium">{v.heartRate} bpm</span></div>
                      <div><span className="text-slate-500">Temp:</span> <span className="font-medium">{v.temperature}°C</span></div>
                      <div><span className="text-slate-500">SpO2:</span> <span className="font-medium">{v.oxygenSaturation}%</span></div>
                      {v.weight && <div><span className="text-slate-500">Weight:</span> <span className="font-medium">{v.weight} kg</span></div>}
                      {v.height && <div><span className="text-slate-500">Height:</span> <span className="font-medium">{v.height} cm</span></div>}
                    </div>
                    {v.notes && <p className="text-xs text-slate-500 mt-2 italic">{v.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Medical Records Tab */}
      {activeTab === "records" && (
        <div className="card">
          {records === undefined ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : records.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No medical records yet</p>
          ) : (
            <div className="space-y-4">
              {records.map((r) => (
                <div key={r._id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatDate(r.visitDate)}</span>
                    <span className="text-sm text-slate-500">Dr. {r.doctorName}</span>
                  </div>
                  <p className="text-sm"><strong>Complaint:</strong> {r.chiefComplaint}</p>
                  <p className="text-sm"><strong>Diagnosis:</strong> {r.diagnosis}</p>
                  {r.treatment && <p className="text-sm"><strong>Treatment:</strong> {r.treatment}</p>}
                  {r.notes && <p className="text-sm text-slate-500 mt-1">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prescriptions Tab */}
      {activeTab === "prescriptions" && (
        <div className="card">
          {patientPrescriptions === undefined ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : patientPrescriptions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No prescriptions for this patient</p>
          ) : (
            <div className="space-y-4">
              {patientPrescriptions.map((rx) => (
                <div key={rx._id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatDate(rx.date)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Dr. {rx.doctorName}</span>
                      <span className={`badge badge-${rx.status}`}>{rx.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {rx.medications.map((med: any, i: number) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                        <span className="font-medium">{med.name}</span>
                        <span className="text-slate-400">•</span>
                        <span>{med.dosage}</span>
                        <span className="text-slate-400">•</span>
                        <span>{med.frequency}</span>
                        <span className="text-slate-400">•</span>
                        <span>{med.duration}</span>
                        {med.instructions && <span className="text-xs text-slate-400 italic ml-2">{med.instructions}</span>}
                      </div>
                    ))}
                  </div>
                  {rx.notes && <p className="text-sm text-slate-500 mt-2">{rx.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admissions Tab */}
      {activeTab === "admissions" && (
        <div className="card">
          {patientAdmissions === undefined ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : patientAdmissions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No admissions for this patient</p>
          ) : (
            <div className="space-y-3">
              {patientAdmissions.map((a) => (
                <div key={a._id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-slate-800">{a.ward}</span>
                    {a.bedNumber && <span className="text-sm font-mono text-slate-600">Bed: {a.bedNumber}</span>}
                    <span className={`badge badge-${a.status === "active" ? "active" : a.status === "discharged" ? "discharged" : "scheduled"}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-600">
                    <div>Admitted: {formatDate(a.admissionDate)}</div>
                    {a.dischargeDate && <div>Discharged: {formatDate(a.dischargeDate)}</div>}
                    {a.doctorName && <div>Doctor: {a.doctorName}</div>}
                    {a.diagnosis && <div>Diagnosis: {a.diagnosis}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteDialog(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-red-800 mb-2">⚠️ Delete Patient Record</h2>
              <p className="text-sm text-slate-600 mb-4">
                This will permanently remove the patient record for <strong>{patient.firstName} {patient.lastName}</strong>.
                Their related appointments, medical records, prescriptions, vitals, and admissions will be preserved.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-700 font-medium mb-1">
                  Type the patient's full name to confirm: <strong>{patient.firstName} {patient.lastName}</strong>
                </p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={`Type "${patient.firstName} ${patient.lastName}"`}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  autoFocus
                />
              </div>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{deleteError}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!deleteConfirmName.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Slide-Over */}
      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEdit(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto animate-slideIn">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Edit Patient</h2>
                <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-slate-100 rounded-lg">✕</button>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{editError}</div>
              )}

              <div className="space-y-4">
                <FormField label="First Name" value={editForm.firstName}
                  onChange={(v) => setEditForm({ ...editForm, firstName: v })} />
                <FormField label="Last Name" value={editForm.lastName}
                  onChange={(v) => setEditForm({ ...editForm, lastName: v })} />
                <FormField label="Phone" value={editForm.phone}
                  onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <FormField label="Email" value={editForm.email}
                  onChange={(v) => setEditForm({ ...editForm, email: v })} />
                <FormField label="Address" value={editForm.address}
                  onChange={(v) => setEditForm({ ...editForm, address: v })} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                  <select value={editForm.bloodGroup} onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="">Select</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="active">Active</option>
                    <option value="critical">Critical</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>

                <FormField label="Emergency Contact" value={editForm.emergencyContact}
                  onChange={(v) => setEditForm({ ...editForm, emergencyContact: v })} />
                <FormField label="Emergency Phone" value={editForm.emergencyPhone}
                  onChange={(v) => setEditForm({ ...editForm, emergencyPhone: v })} />
                <FormField label="Insurance Provider" value={editForm.insuranceProvider}
                  onChange={(v) => setEditForm({ ...editForm, insuranceProvider: v })} />
                <FormField label="Insurance Number" value={editForm.insuranceNumber}
                  onChange={(v) => setEditForm({ ...editForm, insuranceNumber: v })} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={3} />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                <button onClick={() => setShowEdit(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
    </div>
  );
}
