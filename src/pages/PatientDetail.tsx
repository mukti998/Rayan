import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const patient = useQuery(api.patients.get, { patientId: patientId || "" });
  const records = useQuery(
    api.medicalRecords.patientHistory,
    patientId ? { patientId } : "skip"
  );
  const patientPrescriptions = useQuery(
    api.prescriptions.list,
    patientId ? { patientId } : "skip"
  );

  const updatePatient = useMutation(api.patients.update);

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
        callerRole: user?.role,
      });
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/patients")} className="p-2 hover:bg-slate-100 rounded-lg">
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-slate-500">Patient ID: {patient.patientId}</p>
        </div>
        <span className={`badge badge-${patient.status}`}>{patient.status}</span>
        <button onClick={startEdit}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
          Edit Patient
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
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

        {/* Medical Info */}
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

        {/* Quick Stats */}
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
          </div>
        </div>
      </div>

      {/* Medical Records History */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Medical Records History</h3>
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
      <span className="text-slate-800 font-medium">{value}</span>
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
