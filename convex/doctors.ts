import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all doctors
export const list = query({
  args: {
    search: v.optional(v.string()),
    specialization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let doctors = await ctx.db.query("doctors").collect();

    if (args.specialization && args.specialization !== "all") {
      doctors = doctors.filter((d) => d.specialization === args.specialization);
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.specialization.toLowerCase().includes(search)
      );
    }

    return doctors;
  },
});

// Get single doctor
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("doctors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Create doctor
export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    specialization: v.string(),
    licenseNumber: v.string(),
    department: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    consultationFee: v.optional(v.number()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("doctors", {
      ...args,
      available: true,
    });
    return id;
  },
});

// Update doctor
export const update = mutation({
  args: {
    id: v.id("doctors"),
    specialization: v.optional(v.string()),
    department: v.optional(v.string()),
    available: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    consultationFee: v.optional(v.number()),
    bio: v.optional(v.string()),
    schedule: v.optional(v.string()),
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

// Get available doctors
export const available = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const doctors = await ctx.db.query("doctors").collect();
    return doctors.filter((d) => d.available);
  },
});

// Get specializations list
export const specializations = query({
  args: {},
  handler: async (ctx) => {
    const doctors = await ctx.db.query("doctors").collect();
    const specs = [...new Set(doctors.map((d) => d.specialization))];
    return specs.sort();
  },
});
