import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatDate } from "../lib/utils";

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const patient = useQuery(api.patients.get, { patientId: patientId || "" });
  const records = useQuery(
    api.medicalRecords.patientHistory,
    patientId ? { patientId } : "skip"
  );
  const patientPrescriptions = useQuery(
    api.prescriptions.list,
    patientId ? { patientId } : "skip"
  );

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
