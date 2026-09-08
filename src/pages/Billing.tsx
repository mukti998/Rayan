import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { formatDate } from "../lib/utils";

interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function Billing() {
  const { user, sessionToken } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formError, setFormError] = useState("");
  const [printBill, setPrintBill] = useState<any>(null);

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [items, setItems] = useState<BillItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);

  const bills = useQuery(api.billing.list, { status: statusFilter !== "all" ? statusFilter : undefined });
  const patients = useQuery(api.patients.list, {});
  const summary = useQuery(api.billing.summary);
  const createBill = useMutation(api.billing.create);
  const processPayment = useMutation(api.billing.processPayment);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal + tax - discount;

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!patientId) {
      setFormError("Please select a patient");
      return;
    }
    const validItems = items.filter((item) => item.description && item.unitPrice > 0);
    if (validItems.length === 0) {
      setFormError("Add at least one billing item");
      return;
    }
    try {
      await createBill({
        patientId,
        patientName,
        items: validItems,
        subtotal,
        tax,
        discount,
        total,
        paidAmount,
        paymentMethod,
        sessionToken: sessionToken || "",
      });
      setShowCreate(false);
      setPatientId(""); setPatientName("");
      setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      setTax(0); setDiscount(0); setPaidAmount(0);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handlePay = async (billId: string) => {
    const amount = prompt("Enter payment amount:");
    if (amount && !isNaN(Number(amount))) {
      await processPayment({
        id: billId as any,
        amount: Number(amount),
        paymentMethod: "cash",
        sessionToken: sessionToken || "",
      });
    }
  };

  const handlePrint = (bill: any) => {
    setPrintBill(bill);
    setTimeout(() => {
      window.print();
      setPrintBill(null);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500">Manage invoices and process payments</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          {showCreate ? "Close" : "+ Create Invoice"}
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">${summary.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Collected</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-800">${summary.totalBilled.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Billed</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.pendingBills}</p>
            <p className="text-xs text-slate-500">Pending Bills</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.partialBills}</p>
            <p className="text-xs text-slate-500">Partial Payments</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card animate-slideIn">
          <h3 className="font-semibold text-slate-800 mb-4">Create Invoice</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient *</label>
                <select value={patientId} onChange={(e) => {
                  const p = patients?.find((pt) => pt.patientId === e.target.value);
                  setPatientId(e.target.value);
                  setPatientName(p ? `${p.firstName} ${p.lastName}` : "");
                }} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">Select Patient</option>
                  {patients?.map((p) => <option key={p._id} value={p.patientId}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Bill Items *</label>
                <button type="button" onClick={addItem} className="text-sm text-green-600 hover:text-green-800 font-medium">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg">
                    <input type="text" placeholder="Description" value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <input type="number" placeholder="Qty" value={item.quantity || ""}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <div className="flex gap-1">
                      <input type="number" placeholder="Price" value={item.unitPrice || ""}
                        onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="px-2 text-red-400">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax ($)</label>
                <input type="number" value={tax || ""} onChange={(e) => setTax(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount ($)</label>
                <input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid Amount ($)</label>
                <input type="number" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal: ${subtotal.toFixed(2)} + Tax: ${tax} - Discount: ${discount}</span>
              <span className="text-xl font-bold text-slate-800">Total: ${total.toFixed(2)}</span>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2.5 border border-slate-300 rounded-lg outline-none">
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Bills list */}
      {bills === undefined ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bills.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No bills found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id}>
                  <td className="font-medium">{b.patientName}</td>
                  <td className="text-sm">{formatDate(b.date)}</td>
                  <td className="text-sm">{b.items.length} item(s)</td>
                  <td className="font-semibold">${b.total.toFixed(2)}</td>
                  <td className="text-green-600">${b.paidAmount.toFixed(2)}</td>
                  <td className="text-sm text-slate-600">${(b.total - b.paidAmount).toFixed(2)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {b.status !== "paid" && b.status !== "cancelled" && (
                        <button onClick={() => handlePay(String(b._id))}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                          Pay
                        </button>
                      )}
                      <button onClick={() => handlePrint(b)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        🖨 Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Print View (hidden on screen, visible when printing) */}
      {printBill && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 text-black" id="print-area">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Clinic Manager Pro</h1>
              <p className="text-sm text-gray-600">Hospital Invoice</p>
            </div>
            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Invoice Date:</span>
                <span>{formatDate(printBill.date)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Patient:</span>
                <span>{printBill.patientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Status:</span>
                <span className="uppercase font-bold">{printBill.status}</span>
              </div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {printBill.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2">{item.description}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">${item.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-2">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-300 pt-4 space-y-1">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>${printBill.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>Tax</span><span>${printBill.tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>Discount</span><span>-${printBill.discount.toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
                <span>Total Due</span><span>${printBill.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-700">
                <span>Amount Paid</span><span>${printBill.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Balance</span><span>${(printBill.total - printBill.paidAmount).toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
              <p>Thank you for your visit</p>
              <p>Clinic Manager Pro — Hospital Management System</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
