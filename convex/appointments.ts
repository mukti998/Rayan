import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, auditLog } from "./helpers";

// List appointments
export const list = query({
  args: {
    date: v.optional(v.string()),
    doctorId: v.optional(v.string()),
    patientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let appointments = await ctx.db.query("appointments").collect();

    if (args.date) {
      appointments = appointments.filter((a) => a.date === args.date);
    }
    if (args.doctorId) {
      appointments = appointments.filter((a) => a.doctorId === args.doctorId);
    }
    if (args.patientId) {
      appointments = appointments.filter((a) => a.patientId === args.patientId);
    }
    if (args.status && args.status !== "all") {
      appointments = appointments.filter((a) => a.status === args.status);
    }

    return appointments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get today's appointments
export const today = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    return await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();
  },
});

// Create appointment — any authenticated user
export const create = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    date: v.string(),
    time: v.string(),
    reason: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);

    const id = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      patientName: args.patientName,
      doctorId: args.doctorId,
      doctorName: args.doctorName,
      date: args.date,
      time: args.time,
      reason: args.reason,
      status: "scheduled",
      createdAt: Date.now(),
      createdBy: user.username,
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_appointment",
      target: args.patientId,
      details: `Appointment with ${args.doctorName} on ${args.date} at ${args.time}`,
    });

    return id;
  },
});

// Update appointment status
export const updateStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show")
    ),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticate(ctx, args.sessionToken);

    const updates: any = { status: args.status };
    if (args.notes) updates.notes = args.notes;
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

// Cancel appointment
export const cancel = mutation({
  args: {
    id: v.id("appointments"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticate(ctx, args.sessionToken);

    await ctx.db.patch(args.id, { status: "cancelled" });
    return { success: true };
  },
});

// Count appointments by status
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("appointments").collect();
    const today = new Date().toISOString().split("T")[0];
    const todayAppts = all.filter((a) => a.date === today);
    return {
      total: all.length,
      today: todayAppts.length,
      scheduled: all.filter((a) => a.status === "scheduled").length,
      completed: all.filter((a) => a.status === "completed").length,
      cancelled: all.filter((a) => a.status === "cancelled").length,
    };
  },
});
