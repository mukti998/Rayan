import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasRole, auditLog } from "./helpers";

// List medical records
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    doctorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db.query("medicalRecords").collect();

    if (args.patientId) {
      records = records.filter((r) => r.patientId === args.patientId);
    }
    if (args.doctorId) {
      records = records.filter((r) => r.doctorId === args.doctorId);
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get single record
export const get = query({
  args: { id: v.id("medicalRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create medical record — doctor or admin only
export const create = mutation({
  args: {
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
    // Caller identity for server-side role check
    callerRole: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only doctor or admin can create medical records
    if (args.callerRole && !hasRole(args.callerRole, "admin", "doctor")) {
      throw new Error("Access denied — only doctors and administrators can create medical records");
    }

    const id = await ctx.db.insert("medicalRecords", {
      patientId: args.patientId,
      patientName: args.patientName,
      doctorId: args.doctorId,
      doctorName: args.doctorName,
      visitDate: args.visitDate,
      chiefComplaint: args.chiefComplaint,
      diagnosis: args.diagnosis,
      diagnosisCode: args.diagnosisCode,
      treatment: args.treatment,
      notes: args.notes,
      followUpDate: args.followUpDate,
      createdAt: Date.now(),
    });

    // Audit log
    await auditLog(ctx, {
      userId: args.callerId || args.doctorId,
      userName: args.callerName || args.doctorName,
      action: "create_medical_record",
      target: args.patientId,
      details: `Medical record created for ${args.patientName} — diagnosis: ${args.diagnosis}`,
    });

    return id;
  },
});

// Update medical record — doctor or admin only
export const update = mutation({
  args: {
    id: v.id("medicalRecords"),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    notes: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check
    if (args.callerRole && !hasRole(args.callerRole, "admin", "doctor")) {
      throw new Error("Access denied — only doctors and administrators can update medical records");
    }

    const { id, callerRole, ...updates } = args;
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleaned);
    return { success: true };
  },
});

// Get patient history summary
export const patientHistory = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
});
