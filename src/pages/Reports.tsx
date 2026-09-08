import { useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function getDefaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

export default function Reports() {
  const [startDate, setStartDate] = useState(getDefaultStart);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "financial" | "clinical">("overview");
  const printRef = useRef<HTMLDivElement>(null);

  const report = useQuery(api.reports.analytics, { startDate, endDate });

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = (data: any[][], filename: string) => {
    const csv = data.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAppointmentsCSV = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Appointments", report.summary.totalAppointments],
      ["Completed", report.summary.completedAppointments],
      ["Cancelled", report.summary.cancelledAppointments],
      ["No-Show", report.summary.noShowAppointments],
      ["Completion Rate", report.summary.totalAppointments > 0
        ? `${((report.summary.completedAppointments / report.summary.totalAppointments) * 100).toFixed(1)}%`
        : "N/A"],
    ];
    exportCSV(rows, `appointments-report-${startDate}-to-${endDate}.csv`);
  };

  const exportFinancialCSV = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Billed", `$${report.summary.totalBilled.toFixed(2)}`],
      ["Total Collected", `$${report.summary.totalCollected.toFixed(2)}`],
      ["Collection Rate", report.summary.totalBilled > 0
        ? `${((report.summary.totalCollected / report.summary.totalBilled) * 100).toFixed(1)}%`
        : "N/A"],
      ["Pending Bills", report.summary.pendingBills],
      ["Prescriptions Issued", report.summary.prescriptionsIssued],
      ["Low Stock Medications", report.summary.lowStockMedications],
    ];
    exportCSV(rows, `financial-report-${startDate}-to-${endDate}.csv`);
  };

  const exportClinicalCSV = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Vitals Recorded", report.summary.totalVitalsRecorded],
      ["Abnormal Vitals", report.summary.abnormalVitals],
      ["Lab Tests Ordered", report.summary.labTestsOrdered],
      ["Lab Tests Completed", report.summary.labTestsCompleted],
      ["Admissions", report.summary.admissions],
      ["Discharges", report.summary.discharges],
      ["New Patients (period)", report.summary.newPatients],
      ["Total Patients", report.summary.totalPatientsNow],
    ];
    exportCSV(rows, `clinical-report-${startDate}-to-${endDate}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Date-range analytics with CSV export and printable reports</p>
        </div>
        <button onClick={handlePrint} className="px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
          🖨 Print Report
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="card no-print">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <button onClick={() => { setStartDate(getDefaultStart()); setEndDate(new Date().toISOString().split("T")[0]); }}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">
            Last 30 Days
          </button>
        </div>
      </div>

      {report === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div ref={printRef}>
          {/* Print Header (only visible when printing) */}
          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-bold">Clinic Manager Pro — Report</h1>
            <p className="text-sm text-gray-600">{report.period.startDate} to {report.period.endDate}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit no-print">
            {(["overview", "appointments", "financial", "clinical"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Appointments" value={report.summary.totalAppointments} sub={`${report.summary.completedAppointments} completed`} color="bg-purple-500" icon="📅" />
                <StatCard label="Revenue" value={`$${report.summary.totalCollected.toLocaleString()}`} sub={`$${report.summary.totalBilled.toLocaleString()} billed`} color="bg-green-500" icon="💰" />
                <StatCard label="Admissions" value={report.summary.admissions} sub={`${report.summary.discharges} discharged`} color="bg-blue-500" icon="🏥" />
                <StatCard label="Lab Tests" value={report.summary.labTestsOrdered} sub={`${report.summary.labTestsCompleted} completed`} color="bg-indigo-500" icon="🔬" />
                <StatCard label="New Patients" value={report.summary.newPatients} sub={`${report.summary.totalPatientsNow} total`} color="bg-teal-500" icon="👤" />
                <StatCard label="Prescriptions" value={report.summary.prescriptionsIssued} sub="issued" color="bg-amber-500" icon="💊" />
                <StatCard label="Vitals Recorded" value={report.summary.totalVitalsRecorded} sub={`${report.summary.abnormalVitals} abnormal`} color="bg-rose-500" icon="💓" />
                <StatCard label="Low Stock" value={report.summary.lowStockMedications} sub="medications" color="bg-red-500" icon="⚠️" />
              </div>

              {/* Top Doctors */}
              {report.topDoctors.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-800 mb-3">Most Active Doctors</h3>
                  <div className="space-y-2">
                    {report.topDoctors.map((d) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{d.name}</span>
                            <span className="text-slate-500">{d.count} appointments</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${(d.count / report.topDoctors[0].count) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ward Breakdown */}
              {report.wardAdmissions.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-800 mb-3">Admissions by Ward</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {report.wardAdmissions.map((w) => (
                      <div key={w.ward} className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-slate-800">{w.count}</p>
                        <p className="text-xs text-slate-500">{w.ward}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              <div className="flex justify-end no-print">
                <button onClick={exportAppointmentsCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                  📥 Export CSV
                </button>
              </div>
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">Appointment Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-3xl font-bold text-slate-800">{report.summary.totalAppointments}</p>
                    <p className="text-sm text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{report.summary.completedAppointments}</p>
                    <p className="text-sm text-slate-500">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">{report.summary.cancelledAppointments}</p>
                    <p className="text-sm text-slate-500">Cancelled</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-3xl font-bold text-amber-600">{report.summary.noShowAppointments}</p>
                    <p className="text-sm text-slate-500">No-Show</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Completion Rate:</span>{" "}
                    {report.summary.totalAppointments > 0
                      ? `${((report.summary.completedAppointments / report.summary.totalAppointments) * 100).toFixed(1)}%`
                      : "N/A"}
                    {" | "}
                    <span className="font-medium">No-Show Rate:</span>{" "}
                    {report.summary.totalAppointments > 0
                      ? `${((report.summary.noShowAppointments / report.summary.totalAppointments) * 100).toFixed(1)}%`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Daily Trend */}
              {Object.keys(report.dailyAppointments).length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-800 mb-3">Daily Appointments</h3>
                  <div className="space-y-1">
                    {Object.entries(report.dailyAppointments).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => (
                      <div key={date} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-slate-500 text-xs">{date}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
                          <div className="bg-purple-400 h-4 rounded-full" style={{ width: `${(count / Math.max(...Object.values(report.dailyAppointments))) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === "financial" && (
            <div className="space-y-4">
              <div className="flex justify-end no-print">
                <button onClick={exportFinancialCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                  📥 Export CSV
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-green-600">${report.summary.totalCollected.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Collected</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-slate-800">${report.summary.totalBilled.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Billed</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-amber-600">{report.summary.pendingBills}</p>
                  <p className="text-sm text-slate-500">Pending Bills</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {report.summary.totalBilled > 0
                      ? `${((report.summary.totalCollected / report.summary.totalBilled) * 100).toFixed(1)}%`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-slate-500">Collection Rate</p>
                </div>
              </div>

              {/* Daily Revenue */}
              {Object.keys(report.dailyBilling).length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-800 mb-3">Daily Revenue</h3>
                  <div className="space-y-1">
                    {Object.entries(report.dailyBilling).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => (
                      <div key={date} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-slate-500 text-xs">{date}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
                          <div className="bg-green-400 h-4 rounded-full" style={{ width: `${(count / Math.max(...Object.values(report.dailyBilling))) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clinical Tab */}
          {activeTab === "clinical" && (
            <div className="space-y-4">
              <div className="flex justify-end no-print">
                <button onClick={exportClinicalCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                  📥 Export CSV
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-rose-600">{report.summary.totalVitalsRecorded}</p>
                  <p className="text-sm text-slate-500">Vitals Recorded</p>
                  <p className="text-xs text-amber-600 mt-1">{report.summary.abnormalVitals} abnormal</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-indigo-600">{report.summary.labTestsOrdered}</p>
                  <p className="text-sm text-slate-500">Lab Tests Ordered</p>
                  <p className="text-xs text-emerald-600 mt-1">{report.summary.labTestsCompleted} completed</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-blue-600">{report.summary.admissions}</p>
                  <p className="text-sm text-slate-500">Admissions</p>
                  <p className="text-xs text-purple-600 mt-1">{report.summary.discharges} discharges</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-teal-600">{report.summary.newPatients}</p>
                  <p className="text-sm text-slate-500">New Patients</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-amber-600">{report.summary.prescriptionsIssued}</p>
                  <p className="text-sm text-slate-500">Prescriptions Issued</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-red-600">{report.summary.lowStockMedications}</p>
                  <p className="text-sm text-slate-500">Low Stock Meds</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub: string; color: string; icon: string;
}) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        </div>
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
