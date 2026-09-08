import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, auditLog } from "./helpers";

// List vitals records
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db.query("vitals").collect();

    if (args.patientId) {
      records = records.filter((r) => r.patientId === args.patientId);
    }

    records.sort((a, b) => b.timestamp - a.timestamp);

    if (args.limit) {
      records = records.slice(0, args.limit);
    }

    return records;
  },
});

// Get vitals for a specific patient (for patient detail page)
export const patientVitals = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("vitals")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return records.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Record new vitals — any authenticated user (typically nurse)
export const create = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    bloodPressureSystolic: v.number(),
    bloodPressureDiastolic: v.number(),
    heartRate: v.number(),
    temperature: v.number(),
    oxygenSaturation: v.number(),
    respiratoryRate: v.optional(v.number()),
    weight: v.optional(v.number()),
    height: v.optional(v.number()),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);

    const id = await ctx.db.insert("vitals", {
      patientId: args.patientId,
      patientName: args.patientName,
      recordedBy: user.name,
      recordedById: String(user._id),
      timestamp: Date.now(),
      bloodPressureSystolic: args.bloodPressureSystolic,
      bloodPressureDiastolic: args.bloodPressureDiastolic,
      heartRate: args.heartRate,
      temperature: args.temperature,
      oxygenSaturation: args.oxygenSaturation,
      respiratoryRate: args.respiratoryRate,
      weight: args.weight,
      height: args.height,
      notes: args.notes,
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "record_vitals",
      target: args.patientId,
      details: `Vitals recorded: BP ${args.bloodPressureSystolic}/${args.bloodPressureDiastolic}, HR ${args.heartRate}, Temp ${args.temperature}°C, SpO2 ${args.oxygenSaturation}%`,
    });

    return id;
  },
});

// Delete vitals record — admin only
export const remove = mutation({
  args: {
    id: v.id("vitals"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    if (user.role !== "admin") {
      throw new Error("Access denied — only administrators can delete vitals records");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Latest vitals for each patient (for dashboard)
export const latestByPatient = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("vitals").collect();
    const latestMap = new Map<string, typeof all[0]>();
    for (const v of all) {
      const existing = latestMap.get(v.patientId);
      if (!existing || v.timestamp > existing.timestamp) {
        latestMap.set(v.patientId, v);
      }
    }
    return Array.from(latestMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  },
});
