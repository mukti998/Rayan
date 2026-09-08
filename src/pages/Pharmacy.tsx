import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";
import { useCacheEffect } from "../lib/use-cached-query";
import { CACHE_KEYS } from "../lib/offline-cache";

export default function Pharmacy() {
  const { user, sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"inventory" | "pending">("pending");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const medications = useQuery(api.medications.list, { search, category: categoryFilter });
  useCacheEffect(medications, CACHE_KEYS.MEDICATIONS);
  const lowStockMeds = useQuery(api.medications.lowStock);
  const categories = useQuery(api.medications.categories);
  const pendingPrescriptions = useQuery(api.prescriptions.pending);
  const updateStatus = useMutation(api.prescriptions.updateStatus);
  const createMedication = useMutation(api.medications.create);
  const updateStock = useMutation(api.medications.updateStock);

  const [newMed, setNewMed] = useState({
    name: "", genericName: "", category: "", dosageForm: "", strength: "",
    manufacturer: "", stockQuantity: 0, unitPrice: 0, reorderLevel: 0, expiryDate: "",
    batchNumber: "",
  });

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMedication({
        ...newMed,
        genericName: newMed.genericName || undefined,
        manufacturer: newMed.manufacturer || undefined,
        batchNumber: newMed.batchNumber || undefined,
        sessionToken: sessionToken || "",
      });
      setShowAdd(false);
      setNewMed({
        name: "", genericName: "", category: "", dosageForm: "", strength: "",
        manufacturer: "", stockQuantity: 0, unitPrice: 0, reorderLevel: 0, expiryDate: "",
        batchNumber: "",
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDispense = async (prescriptionId: string) => {
    try {
      await updateStatus({
        id: prescriptionId as any,
        status: "dispensed",
        dispensedBy: user?.name || "Pharmacist",
        sessionToken: sessionToken || "",
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestock = async (medId: string, currentStock: number) => {
    const amount = prompt(`Current stock: ${currentStock}. Enter new stock amount:`);
    if (amount && !isNaN(Number(amount))) {
      await updateStock({ id: medId as any, stockQuantity: Number(amount), sessionToken: sessionToken || "" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pharmacy</h1>
        <p className="text-sm text-slate-500">Medication inventory and prescription dispensing</p>
      </div>

      {/* Low stock alert */}
      {lowStockMeds && lowStockMeds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-amber-800 font-semibold flex items-center gap-2">
            <span>⚠️</span> Low Stock Alert ({lowStockMeds.length} items below reorder level)
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockMeds.map((m) => (
              <span key={m._id} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                {m.name} ({m.stockQuantity} left)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pending" ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Pending Prescriptions {pendingPrescriptions ? `(${pendingPrescriptions.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "inventory" ? "bg-white text-slate-800 shadow" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Medication Inventory
        </button>
      </div>

      {/* Pending Prescriptions */}
      {activeTab === "pending" && (
        <div>
          {pendingPrescriptions === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingPrescriptions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-400 text-lg">No pending prescriptions to dispense</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPrescriptions.map((rx) => (
                <div key={rx._id} className="card border-l-4 border-l-amber-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{rx.patientName}</h4>
                      <p className="text-sm text-slate-500">Dr. {rx.doctorName} • {formatDate(rx.date)}</p>
                      <div className="mt-2 space-y-1">
                        {rx.medications.map((med: any, i: number) => (
                          <div key={i} className="text-sm flex items-center gap-2">
                            <span className="font-medium">{med.name}</span>
                            <span className="text-slate-400">|</span>
                            <span>{med.dosage} - {med.frequency} - {med.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispense(String(rx._id))}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                      Dispense
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medication Inventory */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Search medications..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="all">All Categories</option>
              {categories?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowAdd(!showAdd)}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
              {showAdd ? "Close" : "+ Add Medication"}
            </button>
          </div>

          {showAdd && (
            <div className="card animate-slideIn">
              <h3 className="font-semibold text-slate-800 mb-4">Add Medication</h3>
              <form onSubmit={handleAddMedication} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Name *" value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="text" placeholder="Category *" value={newMed.category}
                  onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="text" placeholder="Dosage Form *" value={newMed.dosageForm}
                  onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="text" placeholder="Strength *" value={newMed.strength}
                  onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="number" placeholder="Stock Quantity *" value={newMed.stockQuantity || ""}
                  onChange={(e) => setNewMed({ ...newMed, stockQuantity: Number(e.target.value) })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="number" placeholder="Unit Price *" value={newMed.unitPrice || ""}
                  onChange={(e) => setNewMed({ ...newMed, unitPrice: Number(e.target.value) })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="number" placeholder="Reorder Level *" value={newMed.reorderLevel || ""}
                  onChange={(e) => setNewMed({ ...newMed, reorderLevel: Number(e.target.value) })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <input type="date" value={newMed.expiryDate}
                  onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
                <div className="flex justify-end md:col-span-3">
                  <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    Add Medication
                  </button>
                </div>
              </form>
            </div>
          )}

          {medications === undefined ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Category</th>
                    <th>Form/Strength</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m) => (
                    <tr key={m._id}>
                      <td className="font-medium">{m.name}</td>
                      <td className="text-sm">{m.category}</td>
                      <td className="text-sm">{m.dosageForm} {m.strength}</td>
                      <td>
                        <span className={`font-semibold ${m.stockQuantity <= m.reorderLevel ? "text-red-600" : "text-slate-800"}`}>
                          {m.stockQuantity}
                        </span>
                      </td>
                      <td className="text-sm">${m.unitPrice.toFixed(2)}</td>
                      <td className="text-sm">{m.expiryDate}</td>
                      <td>
                        {m.stockQuantity <= m.reorderLevel ? (
                          <span className="badge badge-critical">Low Stock</span>
                        ) : (
                          <span className="badge badge-active">In Stock</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleRestock(String(m._id), m.stockQuantity)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
