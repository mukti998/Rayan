import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - supports all hospital roles
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("doctor"),
      v.literal("nurse"),
      v.literal("pharmacist"),
      v.literal("receptionist"),
      v.literal("lab Technician")
    ),
    department: v.optional(v.string()),
    phone: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    avatarUrl: v.optional(v.string()),
  }).index("by_username", ["username"])
    .index("by_role", ["role"]),

  // Patients table
  patients: defineTable({
    patientId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.string(),
    bloodGroup: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insuranceNumber: v.optional(v.string()),
    registrationDate: v.number(),
    status: v.union(v.literal("active"), v.literal("discharged"), v.literal("critical")),
    notes: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_patientId", ["patientId"])
    .index("by_name", ["lastName", "firstName"])
    .index("by_status", ["status"]),

  // Doctors table
  doctors: defineTable({
    userId: v.string(),
    name: v.string(),
    specialization: v.string(),
    licenseNumber: v.string(),
    department: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    available: v.boolean(),
    schedule: v.optional(v.string()),
    bio: v.optional(v.string()),
    consultationFee: v.optional(v.number()),
  }).index("by_userId", ["userId"])
    .index("by_specialization", ["specialization"])
    .index("by_department", ["department"]),

  // Appointments table
  appointments: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    date: v.string(),
    time: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show")
    ),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_doctor", ["doctorId", "date"])
    .index("by_patient", ["patientId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  // Medical records table
  medicalRecords: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    visitDate: v.string(),
    chiefComplaint: v.string(),
    diagnosis: v.string(),
    diagnosisCode: v.optional(v.string()),
    treatment: v.optional(v.string()),
    notes: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_patient", ["patientId", "visitDate"])
    .index("by_doctor", ["doctorId"])
    .index("by_date", ["visitDate"]),

  // Prescriptions table
  prescriptions: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    date: v.string(),
    medications: v.array(v.object({
      name: v.string(),
      dosage: v.string(),
      frequency: v.string(),
      duration: v.string(),
      instructions: v.optional(v.string()),
    })),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("dispensed")
    ),
    dispensedAt: v.optional(v.number()),
    dispensedBy: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  // Medications inventory table
  medications: defineTable({
    name: v.string(),
    genericName: v.optional(v.string()),
    category: v.string(),
    dosageForm: v.string(),
    strength: v.string(),
    manufacturer: v.optional(v.string()),
    stockQuantity: v.number(),
    unitPrice: v.number(),
    reorderLevel: v.number(),
    expiryDate: v.string(),
    batchNumber: v.optional(v.string()),
    sideEffects: v.optional(v.array(v.string())),
    contraindications: v.optional(v.array(v.string())),
    active: v.boolean(),
  }).index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_stock", ["stockQuantity"]),

  // Lab results table
  labResults: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    testName: v.string(),
    testType: v.string(),
    results: v.string(),
    normalRange: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("reviewed")
    ),
    orderedDate: v.string(),
    completedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_status", ["status"])
    .index("by_date", ["orderedDate"]),

  // Devices table
  devices: defineTable({
    deviceName: v.string(),
    deviceType: v.string(),
    serialNumber: v.string(),
    department: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("maintenance"),
      v.literal("inactive"),
      v.literal("retired")
    ),
    assignedTo: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    lastMaintenance: v.optional(v.string()),
    nextMaintenance: v.optional(v.string()),
    notes: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_type", ["deviceType"])
    .index("by_department", ["department"]),

  // Departments table
  departments: defineTable({
    name: v.string(),
    headDoctorId: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_name", ["name"]),

  // Billing table
  billing: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.number(),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("cancelled")
    ),
    paymentMethod: v.optional(v.string()),
    paidAmount: v.number(),
    date: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_patient", ["patientId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  // Patient vitals / observations
  vitals: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    recordedBy: v.string(),
    recordedById: v.string(),
    timestamp: v.number(),
    bloodPressureSystolic: v.number(),
    bloodPressureDiastolic: v.number(),
    heartRate: v.number(),
    temperature: v.number(),
    oxygenSaturation: v.number(),
    respiratoryRate: v.optional(v.number()),
    weight: v.optional(v.number()),
    height: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_patient", ["patientId", "timestamp"])
    .index("by_date", ["timestamp"]),

  // Sessions for auth verification
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  // Audit log for security
  auditLog: defineTable({
    userId: v.string(),
    userName: v.string(),
    action: v.string(),
    target: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // IP Allowlist for security
  ipAllowlist: defineTable({
    ipAddress: v.string(),
    label: v.string(),
    addedBy: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_ip", ["ipAddress"]),
});
