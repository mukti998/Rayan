import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-amber-100 text-amber-800 border-amber-300",
  afternoon: "bg-blue-100 text-blue-800 border-blue-300",
  night: "bg-indigo-100 text-indigo-800 border-indigo-300",
};

const SHIFT_TIMES: Record<string, string> = {
  morning: "07:00–15:00",
  afternoon: "15:00–23:00",
  night: "23:00–07:00",
};

function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function Scheduling() {
  const { user, sessionToken } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [wardFilter, setWardFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  const shifts = useQuery(api.scheduling.byDateRange, {
    startDate: weekStart,
    endDate: weekEnd,
    ward: wardFilter !== "all" ? wardFilter : undefined,
  });

  const patients = useQuery(api.patients.list, {});
  const wards = useQuery(api.wards.bedStats);
  const nurses = useQuery(api.users.list, {});
  const createShift = useMutation(api.scheduling.create);
  const updateStatus = useMutation(api.scheduling.updateStatus);
  const removeShift = useMutation(api.scheduling.remove);
  const createWeekShifts = useMutation(api.scheduling.createWeek);

  const isAdmin = user?.role === "admin";
  const nurseList = nurses?.filter((u) => u.role === "nurse" && u.active) || [];
  const wardList = wards?.map((w) => w.ward) || [];

  // Single shift form
  const [createForm, setCreateForm] = useState({
    nurseId: "",
    nurseName: "",
    ward: "",
    date: "",
    shiftType: "morning" as "morning" | "afternoon" | "night",
  });

  // Bulk fill form
  const [bulkForm, setBulkForm] = useState({
    nurseId: "",
    nurseName: "",
    ward: "",
    startDate: weekStart,
    pattern: ["morning", "morning", "morning", "morning", "morning", "off", "off"] as string[],
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createShift({
        ...createForm,
        sessionToken: sessionToken || "",
      });
      setShowCreate(false);
      setCreateForm({ nurseId: "", nurseName: "", ward: "", date: "", shiftType: "morning" });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleBulkCreate = async () => {
    setFormError("");
    try {
      const result = await createWeekShifts({
        ...bulkForm,
        pattern: bulkForm.pattern as any,
        sessionToken: sessionToken || "",
      });
      alert(`Created ${result.created} shifts. ${result.skipped} skipped (conflicts).`);
      setShowBulk(false);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Delete this shift?")) return;
    try {
      await removeShift({ id: shiftId as any, sessionToken: sessionToken || "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Nurse Scheduling
          </h1>
          <p className="text-sm text-slate-500">
            Manage nurse shifts and ward assignments
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulk(!showBulk)}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              {showBulk ? "Close" : "📆 Quick Fill Week"}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
            >
              {showCreate ? "Close" : "+ Add Shift"}
            </button>
          </div>
        )}
      </div>

      {/* Quick Fill Week */}
      {showBulk && isAdmin && (
        <div className="card animate-slideIn border-l-4 border-l-emerald-400">
          <h3 className="font-semibold text-slate-800 mb-4">
            Quick Fill Week
          </h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nurse *
              </label>
              <select
                value={bulkForm.nurseId}
                onChange={(e) => {
                  const n = nurseList.find((u) => u._id === e.target.value);
                  setBulkForm({
                    ...bulkForm,
                    nurseId: e.target.value,
                    nurseName: n?.name || "",
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Nurse</option>
                {nurseList.map((n) => (
                  <option key={n._id} value={n._id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ward *
              </label>
              <select
                value={bulkForm.ward}
                onChange={(e) => setBulkForm({ ...bulkForm, ward: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Ward</option>
                {wardList.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={bulkForm.startDate}
                onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Weekly Pattern (Mon → Sun)
            </label>
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                <div key={day} className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{day}</p>
                  <select
                    value={bulkForm.pattern[i]}
                    onChange={(e) => {
                      const newPattern = [...bulkForm.pattern];
                      newPattern[i] = e.target.value;
                      setBulkForm({ ...bulkForm, pattern: newPattern });
                    }}
                    className="w-full px-1 py-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="morning">🌅 Morning</option>
                    <option value="afternoon">☀️ Afternoon</option>
                    <option value="night">🌙 Night</option>
                    <option value="off"> OFF</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleBulkCreate}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              Create Week Schedule
            </button>
          </div>
        </div>
      )}

      {/* Single Shift Form */}
      {showCreate && isAdmin && (
        <div className="card animate-slideIn border-l-4 border-l-violet-400">
          <h3 className="font-semibold text-slate-800 mb-4">Add Single Shift</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={createForm.nurseId}
              onChange={(e) => {
                const n = nurseList.find((u) => u._id === e.target.value);
                setCreateForm({ ...createForm, nurseId: e.target.value, nurseName: n?.name || "" });
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            >
              <option value="">Nurse</option>
              {nurseList.map((n) => (
                <option key={n._id} value={n._id}>{n.name}</option>
              ))}
            </select>
            <select
              value={createForm.ward}
              onChange={(e) => setCreateForm({ ...createForm, ward: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            >
              <option value="">Ward</option>
              {wardList.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <input
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
            <select
              value={createForm.shiftType}
              onChange={(e) => setCreateForm({ ...createForm, shiftType: e.target.value as any })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="morning">🌅 Morning (7–15)</option>
              <option value="afternoon">☀️ Afternoon (15–23)</option>
              <option value="night">🌙 Night (23–7)</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Week Navigation + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatDateShort(weekStart)} — {formatDateShort(weekEnd)}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-slate-100 rounded-lg text-sm"
          >
            Next →
          </button>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded-lg"
          >
            This Week
          </button>
        </div>
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Wards</option>
          {wardList.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* Weekly Calendar Grid */}
      {shifts === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDates.map((date) => {
            const dayShifts = shifts[date] || [];
            const isToday = date === new Date().toISOString().split("T")[0];
            return (
              <div
                key={date}
                className={`rounded-xl border ${
                  isToday ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white"
                } p-3 min-h-[200px]`}
              >
                <div className="mb-2">
                  <p className={`text-xs font-medium ${isToday ? "text-violet-600" : "text-slate-500"}`}>
                    {formatDateShort(date).split(",")[0]}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-violet-700" : "text-slate-800"}`}>
                    {new Date(date + "T00:00:00").getDate()}
                  </p>
                </div>

                {dayShifts.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">No shifts</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayShifts.map((s) => (
                      <div
                        key={s._id}
                        className={`rounded-lg border p-1.5 text-xs ${SHIFT_COLORS[s.shiftType] || "bg-slate-100"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{s.nurseName.split(" ").slice(-1)[0]}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(String(s._id))}
                              className="text-slate-400 hover:text-red-500 ml-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] opacity-75">
                          {s.shiftStart}–{s.shiftEnd}
                        </p>
                        <p className="text-[10px] opacity-60 truncate">{s.ward}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
