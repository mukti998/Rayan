import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Create medical record
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("medicalRecords", {
      ...args,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Update medical record
export const update = mutation({
  args: {
    id: v.id("medicalRecords"),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    notes: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
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
