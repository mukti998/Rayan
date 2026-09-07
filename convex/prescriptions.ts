import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List prescriptions
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    doctorId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let prescriptions = await ctx.db.query("prescriptions").collect();

    if (args.patientId) {
      prescriptions = prescriptions.filter((p) => p.patientId === args.patientId);
    }
    if (args.doctorId) {
      prescriptions = prescriptions.filter((p) => p.doctorId === args.doctorId);
    }
    if (args.status && args.status !== "all") {
      prescriptions = prescriptions.filter((p) => p.status === args.status);
    }

    return prescriptions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create prescription
export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("prescriptions", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
    return id;
  },
});

// Update prescription status
export const updateStatus = mutation({
  args: {
    id: v.id("prescriptions"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("dispensed")
    ),
    dispensedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.status === "dispensed") {
      updates.dispensedAt = Date.now();
      updates.dispensedBy = args.dispensedBy;
    }
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

// Get pending prescriptions for pharmacy
export const pending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("prescriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});
