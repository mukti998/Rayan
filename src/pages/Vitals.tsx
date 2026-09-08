import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

export default function Vitals() {
  const { user, sessionToken } = useAuth();
  const [showRecord, setShowRecord] = useState(false);
  const [patientFilter, setPatientFilter] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const patients = useQuery(api.patients.list, {});
  const vitalsRecords = useQuery(
    api.vitals.list,
    patientFilter ? { patientId: patientFilter } : { limit: 50 }
  );
  const patientVitalsHistory = useQuery(
    api.vitals.patientVitals,
    selectedPatient ? { patientId: selectedPatient } : "skip"
  );
  const createVitals = useMutation(api.vitals.create);

  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    bpSystolic: "",
    bpDiastolic: "",
    heartRate: "",
    temperature: "",
    oxygenSaturation: "",
    respiratoryRate: "",
    weight: "",
    height: "",
    notes: "",
  });

  const handlePatientChange = (pid: string) => {
    const p = patients?.find((pt) => pt.patientId === pid);
    setFormData({
      ...formData,
      patientId: pid,
      patientName: p ? `${p.firstName} ${p.lastName}` : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formData.patientId) {
      setFormError("Please select a patient");
      return;
    }
    try {
      await createVitals({
        patientId: formData.patientId,
        patientName: formData.patientName,
        bloodPressureSystolic: Number(formData.bpSystolic),
        bloodPressureDiastolic: Number(formData.bpDiastolic),
        heartRate: Number(formData.heartRate),
        temperature: Number(formData.temperature),
        oxygenSaturation: Number(formData.oxygenSaturation),
        respiratoryRate: formData.respiratoryRate
          ? Number(formData.respiratoryRate)
          : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        notes: formData.notes || undefined,
        sessionToken: sessionToken || "",
      });
      setShowRecord(false);
      setFormData({
        patientId: "",
        patientName: "",
        bpSystolic: "",
        bpDiastolic: "",
        heartRate: "",
        temperature: "",
        oxygenSaturation: "",
        respiratoryRate: "",
        weight: "",
        height: "",
        notes: "",
      });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Check if a vitals reading is abnormal
  const getAbnormalFlags = (r: any) => {
    const flags: string[] = [];
    if (r.bloodPressureSystolic > 140 || r.bloodPressureDiastolic > 90)
      flags.push("High BP");
    if (r.bloodPressureSystolic < 90 || r.bloodPressureDiastolic < 60)
      flags.push("Low BP");
    if (r.heartRate > 100) flags.push("High HR");
    if (r.heartRate < 60) flags.push("Low HR");
    if (r.temperature > 37.8) flags.push("Fever");
    if (r.temperature < 36.0) flags.push("Low Temp");
    if (r.oxygenSaturation < 94) flags.push("Low SpO2");
    return flags;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Patient Vitals
          </h1>
          <p className="text-sm text-slate-500">
            Record and track patient observations
          </p>
        </div>
        <button
          onClick={() => setShowRecord(!showRecord)}
          className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
        >
          {showRecord ? "Close" : "+ Record Vitals"}
        </button>
      </div>

      {/* Record Vitals Form */}
      {showRecord && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">
            Record Patient Vitals
          </h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Patient *
              </label>
              <select
                value={formData.patientId}
                onChange={(e) => handlePatientChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                required
              >
                <option value="">Select Patient</option>
                {patients?.map((p) => (
                  <option key={p._id} value={p.patientId}>
                    {p.firstName} {p.lastName} ({p.patientId})
                  </option>
                ))}
              </select>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-red-700 mb-1">
                  BP Systolic (mmHg) *
                </label>
                <input
                  type="number"
                  value={formData.bpSystolic}
                  onChange={(e) =>
                    setFormData({ ...formData, bpSystolic: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="120"
                  required
                />
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-red-700 mb-1">
                  BP Diastolic (mmHg) *
                </label>
                <input
                  type="number"
                  value={formData.bpDiastolic}
                  onChange={(e) =>
                    setFormData({ ...formData, bpDiastolic: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="80"
                  required
                />
              </div>
              <div className="bg-pink-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-pink-700 mb-1">
                  Heart Rate (bpm) *
                </label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) =>
                    setFormData({ ...formData, heartRate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="72"
                  required
                />
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-orange-700 mb-1">
                  Temperature (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="36.8"
                  required
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  SpO2 (%) *
                </label>
                <input
                  type="number"
                  value={formData.oxygenSaturation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      oxygenSaturation: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="98"
                  required
                />
              </div>
              <div className="bg-teal-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-teal-700 mb-1">
                  Respiratory Rate (/min)
                </label>
                <input
                  type="number"
                  value={formData.respiratoryRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      respiratoryRate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="16"
                />
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-green-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="70"
                />
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-green-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) =>
                    setFormData({ ...formData, height: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="170"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                rows={2}
                placeholder="Additional observations..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
              >
                Record Vitals
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter + Patient Selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={patientFilter}
          onChange={(e) => {
            setPatientFilter(e.target.value);
            setSelectedPatient(null);
          }}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
        >
          <option value="">All Patients (Recent 50)</option>
          {patients?.map((p) => (
            <option key={p._id} value={p.patientId}>
              {p.firstName} {p.lastName} ({p.patientId})
            </option>
          ))}
        </select>
      </div>

      {/* Vitals Records */}
      {vitalsRecords === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vitalsRecords.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No vitals records yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Record patient vitals to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vitalsRecords.map((r) => {
            const flags = getAbnormalFlags(r);
            return (
              <div
                key={r._id}
                className={`card hover:shadow-md transition-shadow ${
                  flags.length > 0 ? "border-l-4 border-l-amber-400" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <button
                      onClick={() =>
                        setSelectedPatient(
                          selectedPatient === r.patientId
                            ? null
                            : r.patientId
                        )
                      }
                      className="font-semibold text-slate-800 hover:text-rose-600 transition-colors"
                    >
                      {r.patientName}
                    </button>
                    <span className="text-xs text-slate-400 ml-2">
                      {r.patientId}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recorded by {r.recordedBy} •{" "}
                      {formatDate(new Date(r.timestamp).toISOString())}
                    </p>
                  </div>
                  {flags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {flags.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <VitalBadge
                    label="BP"
                    value={`${r.bloodPressureSystolic}/${r.bloodPressureDiastolic}`}
                    unit="mmHg"
                    abnormal={
                      r.bloodPressureSystolic > 140 ||
                      r.bloodPressureDiastolic > 90 ||
                      r.bloodPressureSystolic < 90 ||
                      r.bloodPressureDiastolic < 60
                    }
                  />
                  <VitalBadge
                    label="HR"
                    value={String(r.heartRate)}
                    unit="bpm"
                    abnormal={r.heartRate > 100 || r.heartRate < 60}
                  />
                  <VitalBadge
                    label="Temp"
                    value={String(r.temperature)}
                    unit="°C"
                    abnormal={r.temperature > 37.8 || r.temperature < 36.0}
                  />
                  <VitalBadge
                    label="SpO2"
                    value={String(r.oxygenSaturation)}
                    unit="%"
                    abnormal={r.oxygenSaturation < 94}
                  />
                  {r.respiratoryRate && (
                    <VitalBadge
                      label="RR"
                      value={String(r.respiratoryRate)}
                      unit="/min"
                      abnormal={false}
                    />
                  )}
                  {r.weight && (
                    <VitalBadge
                      label="Weight"
                      value={String(r.weight)}
                      unit="kg"
                      abnormal={false}
                    />
                  )}
                </div>

                {r.notes && (
                  <p className="text-sm text-slate-500 mt-2 italic">
                    {r.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VitalBadge({
  label,
  value,
  unit,
  abnormal,
}: {
  label: string;
  value: string;
  unit: string;
  abnormal: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-2 text-center ${
        abnormal
          ? "bg-amber-50 border border-amber-200"
          : "bg-slate-50 border border-slate-100"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-lg font-bold ${
          abnormal ? "text-amber-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-slate-400">{unit}</p>
    </div>
  );
}
