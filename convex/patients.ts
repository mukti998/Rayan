import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

// Get all patients
export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let patients;

    if (args.status && args.status !== "all") {
      patients = await ctx.db
        .query("patients")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    } else {
      patients = await ctx.db.query("patients").collect();
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      patients = patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(search) ||
          p.lastName.toLowerCase().includes(search) ||
          p.patientId.toLowerCase().includes(search) ||
          p.phone.includes(search)
      );
    }

    return patients;
  },
});

// Get single patient
export const get = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .unique();
  },
});

// Create patient — requires admin, doctor, nurse, or receptionist role
export const create = mutation({
  args: {
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
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor", "nurse", "receptionist");

    // Check for duplicate patientId
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .unique();
    if (existing) {
      throw new Error("Patient ID already exists");
    }

    const id = await ctx.db.insert("patients", {
      patientId: args.patientId,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      phone: args.phone,
      email: args.email,
      address: args.address,
      bloodGroup: args.bloodGroup,
      allergies: args.allergies,
      emergencyContact: args.emergencyContact,
      emergencyPhone: args.emergencyPhone,
      insuranceProvider: args.insuranceProvider,
      insuranceNumber: args.insuranceNumber,
      notes: args.notes,
      registrationDate: Date.now(),
      status: "active",
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_patient",
      target: args.patientId,
      details: `New patient registered: ${args.firstName} ${args.lastName}`,
    });

    return id;
  },
});

// Update patient — requires admin, doctor, nurse, or receptionist role
export const update = mutation({
  args: {
    id: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    bloodGroup: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insuranceNumber: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("discharged"),
        v.literal("critical")
      )
    ),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor", "nurse", "receptionist");

    const { id, sessionToken, ...updates } = args;
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleaned);
    return { success: true };
  },
});

// Delete patient — admin only, with confirmation name match
// Does NOT delete related records — patient history is preserved permanently.
// The confirmationName param must match the patient's full name to proceed.
export const remove = mutation({
  args: {
    id: v.id("patients"),
    confirmationName: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const patient = await ctx.db.get(args.id);
    if (!patient) throw new Error("Patient not found");

    // Require typed name to match patient's full name
    const expectedName = `${patient.firstName} ${patient.lastName}`;
    if (args.confirmationName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      throw new Error(
        `Confirmation failed: typed name must match "${expectedName}" exactly`
      );
    }

    // Delete the patient record only — related appointments, records, vitals,
    // prescriptions, admissions, billing, and lab results are preserved.
    await ctx.db.delete(args.id);

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "delete_patient",
      target: patient.patientId,
      details: `Deleted patient ${patient.firstName} ${patient.lastName} — related records preserved`,
    });

    return { success: true };
  },
});

// Count patients by status
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("patients").collect();
    return {
      total: all.length,
      active: all.filter((p) => p.status === "active").length,
      critical: all.filter((p) => p.status === "critical").length,
      discharged: all.filter((p) => p.status === "discharged").length,
    };
  },
});
