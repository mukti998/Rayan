import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Create patient
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
  },
  handler: async (ctx, args) => {
    // Check for duplicate patientId
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .unique();
    if (existing) {
      throw new Error("Patient ID already exists");
    }

    const id = await ctx.db.insert("patients", {
      ...args,
      registrationDate: Date.now(),
      status: "active",
    });

    await ctx.db.insert("auditLog", {
      userId: "system",
      userName: "System",
      action: "create_patient",
      target: args.patientId,
      details: `New patient registered: ${args.firstName} ${args.lastName}`,
      timestamp: Date.now(),
    });

    return id;
  },
});

// Update patient
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
    status: v.optional(v.union(v.literal("active"), v.literal("discharged"), v.literal("critical"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleaned);
    return { success: true };
  },
});

// Delete patient
export const remove = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
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
