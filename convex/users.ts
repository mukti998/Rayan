import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all users
export const list = query({
  args: {
    role: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    // Remove passwordHash from output
    users = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest as any;
    });

    if (args.role && args.role !== "all") {
      users = users.filter((u) => u.role === args.role);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search)
      );
    }

    return users;
  },
});

// Get single user
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  },
});

// Toggle user active status
export const toggleActive = mutation({
  args: {
    id: v.id("users"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: args.active });
    return { success: true };
  },
});

// Update user role
export const updateRole = mutation({
  args: {
    id: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("doctor"),
      v.literal("nurse"),
      v.literal("pharmacist"),
      v.literal("receptionist"),
      v.literal("lab Technician")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { role: args.role });
    return { success: true };
  },
});

// Delete user
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// User counts by role
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return {
      total: users.length,
      active: users.filter((u) => u.active).length,
      admins: users.filter((u) => u.role === "admin").length,
      doctors: users.filter((u) => u.role === "doctor").length,
      nurses: users.filter((u) => u.role === "nurse").length,
      pharmacists: users.filter((u) => u.role === "pharmacist").length,
      receptionists: users.filter((u) => u.role === "receptionist").length,
      labTechnicians: users.filter((u) => u.role === "lab Technician").length,
    };
  },
});
