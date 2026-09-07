import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useQuery(api.audit.dashboardStats);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Patients", value: stats.patients.total, sub: `${stats.patients.active} active`, color: "bg-blue-500", icon: "👤" },
    { label: "Today's Appointments", value: stats.appointments.today, sub: `${stats.appointments.scheduled} scheduled`, color: "bg-purple-500", icon: "📅" },
    { label: "Active Doctors", value: stats.doctors.available, sub: `of ${stats.doctors.total} total`, color: "bg-teal-500", icon: "🩺" },
    { label: "Active Prescriptions", value: stats.prescriptions.active, sub: "pending medications", color: "bg-amber-500", icon: "💊" },
    { label: "Lab Results", value: stats.lab.completed, sub: `${stats.lab.pending} pending`, color: "bg-indigo-500", icon: "🔬" },
    { label: "Devices Online", value: stats.devices.active, sub: `${stats.devices.maintenance} in maintenance`, color: "bg-emerald-500", icon: "🖥️" },
    { label: "Revenue Collected", value: `$${stats.billing.totalPaid.toLocaleString()}`, sub: `$${stats.billing.totalBilled.toLocaleString()} billed`, color: "bg-green-500", icon: "💰" },
    { label: "Low Stock Medications", value: stats.medications.lowStock, sub: `of ${stats.medications.total} items`, color: "bg-red-500", icon: "⚠️" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-teal-100 mt-1">
          Here's an overview of your hospital operations for today.
        </p>
        <div className="flex gap-6 mt-4">
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-2xl font-bold">{stats.patients.total}</p>
            <p className="text-xs text-teal-100">Patients</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-2xl font-bold">{stats.appointments.today}</p>
            <p className="text-xs text-teal-100">Appointments Today</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-2xl font-bold">{stats.users.active}</p>
            <p className="text-xs text-teal-100">Staff Members</p>
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {(stats.patients.critical > 0 || stats.medications.lowStock > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-red-800 font-semibold flex items-center gap-2">
            <span>🚨</span> Critical Alerts
          </h3>
          <div className="mt-2 space-y-1">
            {stats.patients.critical > 0 && (
              <p className="text-red-700 text-sm">
                {stats.patients.critical} patient(s) in critical condition
              </p>
            )}
            {stats.medications.lowStock > 0 && (
              <p className="text-red-700 text-sm">
                {stats.medications.lowStock} medication(s) below reorder level
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
              </div>
              <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a href="/patients" className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
            Register Patient
          </a>
          <a href="/appointments" className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            New Appointment
          </a>
          <a href="/prescriptions" className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium">
            Write Prescription
          </a>
          <a href="/lab" className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            Order Lab Test
          </a>
          <a href="/billing" className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            Create Invoice
          </a>
        </div>
      </div>
    </div>
  );
}
