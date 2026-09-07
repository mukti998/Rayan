import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List audit logs
export const list = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("auditLog").collect();

    if (args.userId) {
      logs = logs.filter((l) => l.userId === args.userId);
    }

    logs.sort((a, b) => b.timestamp - a.timestamp);

    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }

    return logs;
  },
});

// Add audit log entry
export const log = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    action: v.string(),
    target: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("auditLog", {
      ...args,
      timestamp: Date.now(),
    });
    return id;
  },
});

// Dashboard stats
export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const patients = await ctx.db.query("patients").collect();
    const appointments = await ctx.db.query("appointments").collect();
    const doctors = await ctx.db.query("doctors").collect();
    const medications = await ctx.db.query("medications").collect();
    const prescriptions = await ctx.db.query("prescriptions").collect();
    const bills = await ctx.db.query("billing").collect();
    const labResults = await ctx.db.query("labResults").collect();
    const devices = await ctx.db.query("devices").collect();
    const users = await ctx.db.query("users").collect();

    const today = new Date().toISOString().split("T")[0];
    const todayAppts = appointments.filter((a) => a.date === today);

    return {
      patients: {
        total: patients.length,
        active: patients.filter((p) => p.status === "active").length,
        critical: patients.filter((p) => p.status === "critical").length,
        discharged: patients.filter((p) => p.status === "discharged").length,
      },
      appointments: {
        total: appointments.length,
        today: todayAppts.length,
        scheduled: appointments.filter((a) => a.status === "scheduled").length,
        completed: appointments.filter((a) => a.status === "completed").length,
      },
      doctors: {
        total: doctors.length,
        available: doctors.filter((d) => d.available).length,
      },
      prescriptions: {
        total: prescriptions.length,
        active: prescriptions.filter((p) => p.status === "active").length,
        pendingDispense: prescriptions.filter((p) => p.status === "active").length,
      },
      medications: {
        total: medications.length,
        lowStock: medications.filter((m) => m.stockQuantity <= m.reorderLevel).length,
      },
      billing: {
        totalBilled: bills.reduce((sum, b) => sum + b.total, 0),
        totalPaid: bills.reduce((sum, b) => sum + b.paidAmount, 0),
        pendingBills: bills.filter((b) => b.status === "pending").length,
      },
      lab: {
        total: labResults.length,
        pending: labResults.filter((l) => l.status === "pending").length,
        completed: labResults.filter((l) => l.status === "completed").length,
      },
      devices: {
        total: devices.length,
        active: devices.filter((d) => d.status === "active").length,
        maintenance: devices.filter((d) => d.status === "maintenance").length,
      },
      users: {
        total: users.length,
        active: users.filter((u) => u.active).length,
      },
    };
  },
});

// IP Allowlist
export const listIPs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("ipAllowlist").collect();
  },
});

export const addIP = mutation({
  args: {
    ipAddress: v.string(),
    label: v.string(),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ipAllowlist", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const toggleIP = mutation({
  args: {
    id: v.id("ipAllowlist"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
    return { success: true };
  },
});

export const removeIP = mutation({
  args: { id: v.id("ipAllowlist") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
