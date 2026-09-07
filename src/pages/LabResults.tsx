import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

export default function LabResults() {
  const { user } = useAuth();
  const [showOrder, setShowOrder] = useState(false);
  const [showResult, setShowResult] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formError, setFormError] = useState("");

  const [orderForm, setOrderForm] = useState({
    patientId: "", patientName: "", doctorId: "", doctorName: "",
    testName: "", testType: "", orderedDate: new Date().toISOString().split("T")[0], notes: "",
  });
  const [resultForm, setResultForm] = useState({ results: "", normalRange: "", notes: "" });

  const labResults = useQuery(api.labResults.list, { status: statusFilter !== "all" ? statusFilter : undefined });
  const patients = useQuery(api.patients.list, {});
  const doctors = useQuery(api.doctors.list, {});
  const createOrder = useMutation(api.labResults.order);
  const updateResult = useMutation(api.labResults.update);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createOrder({
        patientId: orderForm.patientId,
        patientName: orderForm.patientName,
        doctorId: orderForm.doctorId,
        doctorName: orderForm.doctorName,
        testName: orderForm.testName,
        testType: orderForm.testType,
        orderedDate: orderForm.orderedDate,
        notes: orderForm.notes || undefined,
      });
      setShowOrder(false);
      setOrderForm({
        patientId: "", patientName: "", doctorId: "", doctorName: "",
        testName: "", testType: "", orderedDate: new Date().toISOString().split("T")[0], notes: "",
      });
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleResultSubmit = async () => {
    if (!showResult) return;
    try {
      await updateResult({
        id: showResult as any,
        results: resultForm.results,
        normalRange: resultForm.normalRange || undefined,
        notes: resultForm.notes || undefined,
        status: "completed",
      });
      setShowResult(null);
      setResultForm({ results: "", normalRange: "", notes: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lab Results</h1>
          <p className="text-sm text-slate-500">Order tests and manage laboratory results</p>
        </div>
        <button onClick={() => setShowOrder(!showOrder)}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          {showOrder ? "Close" : "+ Order Lab Test"}
        </button>
      </div>

      {showOrder && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">Order Lab Test</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
              <select value={orderForm.patientId} onChange={(e) => {
                const p = patients?.find((pt) => pt.patientId === e.target.value);
                setOrderForm({ ...orderForm, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
              }} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                <option value="">Select Patient</option>
                {patients?.map((p) => <option key={p._id} value={p.patientId}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ordered By *</label>
              <select value={orderForm.doctorId} onChange={(e) => {
                const d = doctors?.find((doc) => String(doc._id) === e.target.value);
                setOrderForm({ ...orderForm, doctorId: e.target.value, doctorName: d?.name || "" });
              }} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                <option value="">Select Doctor</option>
                {doctors?.map((d) => <option key={d._id} value={String(d._id)}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Name *</label>
              <input type="text" value={orderForm.testName} onChange={(e) => setOrderForm({ ...orderForm, testName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Complete Blood Count" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Type *</label>
              <select value={orderForm.testType} onChange={(e) => setOrderForm({ ...orderForm, testType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                <option value="">Select Type</option>
                <option value="Blood">Blood</option>
                <option value="Urine">Urine</option>
                <option value="Imaging">Imaging</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Pathology">Pathology</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                Place Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Result entry modal */}
      {showResult && (
        <div className="card border-l-4 border-l-indigo-400 animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">Enter Test Results</h3>
          <div className="space-y-3">
            <textarea value={resultForm.results} onChange={(e) => setResultForm({ ...resultForm, results: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={3} placeholder="Test results..." />
            <input type="text" value={resultForm.normalRange} onChange={(e) => setResultForm({ ...resultForm, normalRange: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Normal range" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowResult(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              <button onClick={handleResultSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                Submit Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="reviewed">Reviewed</option>
      </select>

      {/* Lab results list */}
      {labResults === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : labResults.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No lab results found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Test</th>
                <th>Type</th>
                <th>Ordered By</th>
                <th>Date</th>
                <th>Results</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labResults.map((lr) => (
                <tr key={lr._id}>
                  <td className="font-medium">{lr.patientName}</td>
                  <td>{lr.testName}</td>
                  <td className="text-sm">{lr.testType}</td>
                  <td className="text-sm">{lr.doctorName}</td>
                  <td className="text-sm">{formatDate(lr.orderedDate)}</td>
                  <td className="text-sm max-w-[200px] truncate">{lr.results || "—"}</td>
                  <td><span className={`badge badge-${lr.status}`}>{lr.status}</span></td>
                  <td>
                    {(lr.status === "pending" || lr.status === "completed") && (
                      <button onClick={() => { setShowResult(String(lr._id)); setResultForm({ results: lr.results, normalRange: lr.normalRange || "", notes: lr.notes || "" }); }}
                        className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                        {lr.status === "pending" ? "Enter Results" : "Edit"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
