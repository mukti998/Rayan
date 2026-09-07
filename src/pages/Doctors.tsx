import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("all");
  const doctors = useQuery(api.doctors.list, { search, specialization: specFilter });
  const specializations = useQuery(api.doctors.specializations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Doctor Management</h1>
        <p className="text-sm text-slate-500">View and manage medical staff</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
        />
        <select
          value={specFilter}
          onChange={(e) => setSpecFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
        >
          <option value="all">All Specializations</option>
          {specializations?.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {doctors === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No doctors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg">
                  {doc.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{doc.name}</h3>
                  <p className="text-sm text-blue-600">{doc.specialization}</p>
                  <p className="text-xs text-slate-500 mt-1">Dept: {doc.department}</p>
                  <p className="text-xs text-slate-500">License: {doc.licenseNumber}</p>
                </div>
                <span className={`badge ${doc.available ? "badge-active" : "badge-inactive"}`}>
                  {doc.available ? "Available" : "Unavailable"}
                </span>
              </div>
              {doc.consultationFee && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
                  <span className="text-slate-500">Consultation Fee</span>
                  <span className="font-semibold text-slate-800">${doc.consultationFee}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
