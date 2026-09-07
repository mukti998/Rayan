import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

export default function MedicalRecords() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    doctorId: "",
    doctorName: "",
    visitDate: new Date().toISOString().split("T")[0],
    chiefComplaint: "",
    diagnosis: "",
    diagnosisCode: "",
    treatment: "",
    notes: "",
    followUpDate: "",
  });

  const records = useQuery(api.medicalRecords.list, {});
  const patients = useQuery(api.patients.list, {});
  const doctors = useQuery(api.doctors.list, {});
  const createRecord = useMutation(api.medicalRecords.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createRecord({
        patientId: formData.patientId,
        patientName: formData.patientName,
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        visitDate: formData.visitDate,
        chiefComplaint: formData.chiefComplaint,
        diagnosis: formData.diagnosis,
        diagnosisCode: formData.diagnosisCode || undefined,
        treatment: formData.treatment || undefined,
        notes: formData.notes || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      setShowCreate(false);
      setFormData({
        patientId: "", patientName: "", doctorId: "", doctorName: "",
        visitDate: new Date().toISOString().split("T")[0],
        chiefComplaint: "", diagnosis: "", diagnosisCode: "",
        treatment: "", notes: "", followUpDate: "",
      });
    } catch (err: any) {
      setFormError(err.message);
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
          <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
          <p className="text-sm text-slate-500">Manage patient diagnoses, treatments, and clinical notes</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {showCreate ? "Close" : "+ New Record"}
        </button>
      </div>

      {showCreate && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">New Medical Record</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
              <select value={formData.patientId} onChange={(e) => handlePatientChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="">Select Patient</option>
                {patients?.map((p) => (
                  <option key={p._id} value={p.patientId}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Doctor *</label>
              <select value={formData.doctorId} onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="">Select Doctor</option>
                {doctors?.map((d) => (
                  <option key={d._id} value={String(d._id)}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date *</label>
              <input type="date" value={formData.visitDate} onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
              <input type="date" value={formData.followUpDate} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Chief Complaint *</label>
              <input type="text" value={formData.chiefComplaint} onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Primary reason for visit" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis *</label>
              <textarea value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={2} placeholder="Clinical diagnosis" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis Code</label>
              <input type="text" value={formData.diagnosisCode} onChange={(e) => setFormData({ ...formData, diagnosisCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="ICD-10 code" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Plan</label>
              <input type="text" value={formData.treatment} onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Treatment plan" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={3} placeholder="Additional clinical notes" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records list */}
      {records === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No medical records yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div key={r._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-800">{r.patientName}</span>
                    <span className="text-xs text-slate-400">ID: {r.patientId}</span>
                    <span className="text-sm text-slate-500">{formatDate(r.visitDate)}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Complaint: </span>
                      <span className="text-slate-700">{r.chiefComplaint}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Diagnosis: </span>
                      <span className="text-slate-700 font-medium">{r.diagnosis}</span>
                      {r.diagnosisCode && <span className="text-xs text-slate-400 ml-1">({r.diagnosisCode})</span>}
                    </div>
                    <div>
                      <span className="text-slate-500">Doctor: </span>
                      <span className="text-slate-700">{r.doctorName}</span>
                    </div>
                  </div>
                  {r.treatment && (
                    <p className="text-sm mt-2"><span className="text-slate-500">Treatment: </span>{r.treatment}</p>
                  )}
                  {r.notes && <p className="text-sm text-slate-500 mt-1 italic">{r.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
