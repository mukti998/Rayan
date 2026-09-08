import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth-context";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Building2, Users, X } from "lucide-react";

export default function Departments() {
  const { user, sessionToken } = useAuth();
  const departments = useQuery(api.departments.list);
  const doctors = useQuery(api.doctors.list, {});
  const createDepartment = useMutation(api.departments.create);
  const updateDepartment = useMutation(api.departments.update);
  const removeDepartment = useMutation(api.departments.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headDoctorId: "",
    phone: "",
    location: "",
  });
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  const getDoctorCount = (deptName: string) => {
    if (!doctors) return 0;
    return doctors.filter((d) => d.department === deptName).length;
  };

  const getHeadName = (headDoctorId?: string) => {
    if (!headDoctorId || !doctors) return null;
    const doc = doctors.find((d) => d._id === headDoctorId);
    return doc?.name || null;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Department name is required");
      return;
    }
    if (!sessionToken) return;
    setError("");
    try {
      if (editingId) {
        await updateDepartment({
          id: editingId as any,
          sessionToken,
          name: formData.name,
          description: formData.description || undefined,
          headDoctorId: formData.headDoctorId || undefined,
          phone: formData.phone || undefined,
          location: formData.location || undefined,
        });
      } else {
        await createDepartment({
          sessionToken,
          name: formData.name,
          description: formData.description || undefined,
          headDoctorId: formData.headDoctorId || undefined,
          phone: formData.phone || undefined,
          location: formData.location || undefined,
        });
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || "Failed to save department");
    }
  };

  const handleEdit = (dept: any) => {
    setEditingId(dept._id);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      headDoctorId: dept.headDoctorId || "",
      phone: dept.phone || "",
      location: dept.location || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    if (!sessionToken) return;
    try {
      await removeDepartment({ id: id as any, sessionToken });
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", headDoctorId: "", phone: "", location: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  if (departments === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage hospital departments and units</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Department
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, i) => {
          const headName = getHeadName(dept.headDoctorId);
          return (
            <motion.div
              key={dept._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                    {dept.location && <p className="text-xs text-slate-400">{dept.location}</p>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(dept)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(dept._id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {dept.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{dept.description}</p>}

              <div className="space-y-2">
                {headName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">Head: <span className="font-medium text-slate-900">{headName}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">Doctors: <span className="font-medium text-slate-900">{getDoctorCount(dept.name)}</span></span>
                </div>
                {dept.phone && (
                  <div className="text-sm text-slate-600">📞 {dept.phone}</div>
                )}
              </div>
            </motion.div>
          );
        })}

        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            No departments found. {isAdmin && "Click 'Add Department' to create one."}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Department" : "New Department"}</h2>
                <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Brief description of the department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Head (Doctor)</label>
                <select
                  value={formData.headDoctorId}
                  onChange={(e) => setFormData({ ...formData, headDoctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None assigned</option>
                  {doctors?.map((doc) => (
                    <option key={doc._id} value={doc._id}>{doc.name} — {doc.specialization}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Building/Floor"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={resetForm} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {editingId ? "Save Changes" : "Create Department"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
