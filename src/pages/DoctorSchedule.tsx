import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

interface WeekSchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

const EMPTY_SCHEDULE: WeekSchedule = {
  monday: "", tuesday: "", wednesday: "", thursday: "",
  friday: "", saturday: "", sunday: "",
};

function parseSchedule(raw: string | undefined): WeekSchedule {
  if (!raw) return EMPTY_SCHEDULE;
  try {
    return { ...EMPTY_SCHEDULE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_SCHEDULE;
  }
}

function serializeSchedule(schedule: WeekSchedule): string {
  return JSON.stringify(schedule);
}

export default function DoctorSchedule() {
  const { user, sessionToken } = useAuth();
  const doctors = useQuery(api.doctors.list, {});
  const updateDoctor = useMutation(api.doctors.update);

  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [editSchedule, setEditSchedule] = useState<WeekSchedule>(EMPTY_SCHEDULE);
  const [isEditing, setIsEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const isAdmin = user?.role === "admin";
  const selectedDoc = doctors?.find((d) => String(d._id) === selectedDoctor);

  const startEdit = () => {
    if (!selectedDoc) return;
    setEditSchedule(parseSchedule(selectedDoc.schedule));
    setIsEditing(true);
    setSaveMsg("");
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    try {
      await updateDoctor({
        id: selectedDoc._id,
        schedule: serializeSchedule(editSchedule),
        sessionToken: sessionToken || "",
      });
      setIsEditing(false);
      setSaveMsg("Schedule saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const displaySchedule = isEditing ? editSchedule : parseSchedule(selectedDoc?.schedule);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Doctor Schedules</h1>
        <p className="text-sm text-slate-500">View and manage weekly timetables</p>
      </div>

      {/* Doctor Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Doctor</label>
        <div className="flex gap-3">
          <select
            value={selectedDoctor}
            onChange={(e) => { setSelectedDoctor(e.target.value); setIsEditing(false); setSaveMsg(""); }}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Choose a doctor...</option>
            {doctors?.map((d) => (
              <option key={d._id} value={String(d._id)}>
                {d.name} — {d.specialization}
              </option>
            ))}
          </select>
          {selectedDoctor && isAdmin && !isEditing && (
            <button onClick={startEdit} className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
              Edit Schedule
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </>
          )}
        </div>
        {saveMsg && <p className="text-sm text-emerald-600 mt-2">{saveMsg}</p>}
      </div>

      {/* Schedule Grid */}
      {selectedDoc && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">{selectedDoc.name}</h3>
              <p className="text-sm text-slate-500">{selectedDoc.specialization} • {selectedDoc.department}</p>
            </div>
            <span className={`badge ${selectedDoc.available ? "badge-active" : "badge-inactive"}`}>
              {selectedDoc.available ? "Available" : "Unavailable"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS.map((day) => {
              const value = displaySchedule[day] || "";
              const hasContent = value.trim().length > 0;
              const isWeekend = day === "saturday" || day === "sunday";

              return (
                <div
                  key={day}
                  className={`rounded-xl border p-3 min-h-[120px] ${
                    isWeekend ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"
                  }`}
                >
                  <p className={`text-xs font-semibold mb-2 ${isWeekend ? "text-slate-400" : "text-slate-600"}`}>
                    {DAY_LABELS[day]}
                  </p>

                  {isEditing ? (
                    <textarea
                      value={value}
                      onChange={(e) => setEditSchedule({ ...editSchedule, [day]: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                      rows={4}
                      placeholder="e.g. 9:00-12:00&#10;14:00-17:00"
                    />
                  ) : hasContent ? (
                    <div className="space-y-1">
                      {value.split("\n").filter(Boolean).map((line, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium mr-1 mb-1">
                          {line.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 italic">Off</p>
                  )}
                </div>
              );
            })}
          </div>

          {!isEditing && !selectedDoc.schedule && (
            <p className="text-sm text-slate-400 text-center mt-4">
              No schedule set. {isAdmin ? "Click \"Edit Schedule\" to set one." : ""}
            </p>
          )}
        </div>
      )}

      {/* All Doctors Overview */}
      {doctors && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">All Doctors — Schedule Status</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>Schedule Set</th>
                  <th>Days Active</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => {
                  const sched = parseSchedule(d.schedule);
                  const activeDays = DAYS.filter((day) => (sched[day] || "").trim().length > 0).length;
                  return (
                    <tr key={d._id}>
                      <td className="font-medium">{d.name}</td>
                      <td className="text-sm">{d.specialization}</td>
                      <td className="text-sm">{d.department}</td>
                      <td>
                        <span className={`badge ${d.schedule ? "badge-active" : "badge-inactive"}`}>
                          {d.schedule ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="text-sm">
                        {activeDays > 0 ? `${activeDays}/7 days` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
