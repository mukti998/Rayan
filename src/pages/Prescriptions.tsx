import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

interface MedicationEntry {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function Prescriptions() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<MedicationEntry[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);

  const prescriptions = useQuery(api.prescriptions.list, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const patients = useQuery(api.patients.list, {});
  const doctors = useQuery(api.doctors.list, {});
  const createPrescription = useMutation(api.prescriptions.create);

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof MedicationEntry, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!patientId || !doctorId) {
      setFormError("Please select a patient and doctor");
      return;
    }
    const validMeds = medications.filter((m) => m.name && m.dosage);
    if (validMeds.length === 0) {
      setFormError("Add at least one medication");
      return;
    }
    try {
      await createPrescription({
        patientId,
        patientName,
        doctorId,
        doctorName,
        date,
        medications: validMeds,
        notes: notes || undefined,
      });
      setShowCreate(false);
      setPatientId(""); setPatientName(""); setDoctorId(""); setDoctorName("");
      setNotes(""); setMedications([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prescriptions</h1>
          <p className="text-sm text-slate-500">Create and manage patient prescriptions</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          {showCreate ? "Close" : "+ New Prescription"}
        </button>
      </div>

      {showCreate && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">New Prescription</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
                <select value={patientId} onChange={(e) => {
                  const p = patients?.find((pt) => pt.patientId === e.target.value);
                  setPatientId(e.target.value);
                  setPatientName(p ? `${p.firstName} ${p.lastName}` : "");
                }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" required>
                  <option value="">Select Patient</option>
                  {patients?.map((p) => (
                    <option key={p._id} value={p.patientId}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Doctor *</label>
                <select value={doctorId} onChange={(e) => {
                  const d = doctors?.find((doc) => String(doc._id) === e.target.value);
                  setDoctorId(e.target.value);
                  setDoctorName(d?.name || "");
                }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" required>
                  <option value="">Select Doctor</option>
                  {doctors?.map((d) => (
                    <option key={d._id} value={String(d._id)}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" required />
              </div>
            </div>

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Medications *</label>
                <button type="button" onClick={addMedication}
                  className="text-sm text-amber-600 hover:text-amber-800 font-medium">+ Add Medication</button>
              </div>
              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg">
                    <input type="text" placeholder="Medication name" value={med.name}
                      onChange={(e) => updateMedication(idx, "name", e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    <input type="text" placeholder="Dosage (e.g. 500mg)" value={med.dosage}
                      onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    <input type="text" placeholder="Frequency (e.g. 3x/day)" value={med.frequency}
                      onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    <input type="text" placeholder="Duration" value={med.duration}
                      onChange={(e) => updateMedication(idx, "duration", e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    <div className="flex gap-1">
                      <input type="text" placeholder="Instructions" value={med.instructions}
                        onChange={(e) => updateMedication(idx, "instructions", e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                      {medications.length > 1 && (
                        <button type="button" onClick={() => removeMedication(idx)}
                          className="px-2 text-red-400 hover:text-red-600">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                rows={2} placeholder="Additional notes" />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium">
                Save Prescription
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="dispensed">Dispensed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Prescriptions list */}
      {prescriptions === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No prescriptions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">{rx.patientName}</h4>
                  <p className="text-sm text-slate-500">Prescribed by {rx.doctorName} • {formatDate(rx.date)}</p>
                </div>
                <span className={`badge badge-${rx.status}`}>{rx.status}</span>
              </div>
              <div className="space-y-2">
                {rx.medications.map((med: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800">{med.name}</span>
                    <span className="text-slate-500">•</span>
                    <span>{med.dosage}</span>
                    <span className="text-slate-500">•</span>
                    <span>{med.frequency}</span>
                    <span className="text-slate-500">•</span>
                    <span>{med.duration}</span>
                    {med.instructions && (
                      <span className="text-xs text-slate-400 italic ml-2">{med.instructions}</span>
                    )}
                  </div>
                ))}
              </div>
              {rx.notes && <p className="text-sm text-slate-500 mt-2">{rx.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
