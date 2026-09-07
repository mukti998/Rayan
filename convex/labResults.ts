import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List lab results
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("labResults").collect();

    if (args.patientId) {
      results = results.filter((r) => r.patientId === args.patientId);
    }
    if (args.status && args.status !== "all") {
      results = results.filter((r) => r.status === args.status);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create lab result
export const create = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    testName: v.string(),
    testType: v.string(),
    results: v.string(),
    normalRange: v.optional(v.string()),
    orderedDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("labResults", {
      ...args,
      status: "completed",
      completedDate: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
    });
    return id;
  },
});

// Order lab test
export const order = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    testName: v.string(),
    testType: v.string(),
    orderedDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("labResults", {
      ...args,
      results: "",
      status: "pending",
      createdAt: Date.now(),
    });
    return id;
  },
});

// Update lab result
export const update = mutation({
  args: {
    id: v.id("labResults"),
    results: v.string(),
    normalRange: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("reviewed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      results: args.results,
      normalRange: args.normalRange,
      notes: args.notes,
      status: args.status,
      completedDate: new Date().toISOString().split("T")[0],
    });
    return { success: true };
  },
});
