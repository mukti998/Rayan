import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auditLog } from "./helpers";

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

// Toggle user active status — admin only
export const toggleActive = mutation({
  args: {
    id: v.id("users"),
    active: v.boolean(),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only admin can enable/disable users
    if (args.callerRole && args.callerRole !== "admin") {
      throw new Error("Access denied — only administrators can change user status");
    }

    await ctx.db.patch(args.id, { active: args.active });

    // Audit log
    const user = await ctx.db.get(args.id);
    if (user) {
      await auditLog(ctx, {
        userId: args.callerRole ? "admin" : "system",
        userName: args.callerRole || "System",
        action: args.active ? "enable_user" : "disable_user",
        target: (user as any).username,
        details: `User ${args.active ? "enabled" : "disabled"}: ${(user as any).name}`,
      });
    }

    return { success: true };
  },
});

// Update user role — admin only
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
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only admin can change roles
    if (args.callerRole && args.callerRole !== "admin") {
      throw new Error("Access denied — only administrators can change user roles");
    }

    const user = await ctx.db.get(args.id);
    const oldRole = user && "role" in user ? (user as any).role : "unknown";
    await ctx.db.patch(args.id, { role: args.role });

    // Audit log
    if (user) {
      await auditLog(ctx, {
        userId: args.callerRole ? "admin" : "system",
        userName: args.callerRole || "System",
        action: "update_role",
        target: (user as any).username,
        details: `Role changed from ${oldRole} to ${args.role} for ${(user as any).name}`,
      });
    }

    return { success: true };
  },
});

// Delete user — admin only
export const remove = mutation({
  args: {
    id: v.id("users"),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only admin can delete users
    if (args.callerRole && args.callerRole !== "admin") {
      throw new Error("Access denied — only administrators can delete users");
    }

    const user = await ctx.db.get(args.id);
    if (user && (user as any).username === "admin") {
      throw new Error("Cannot delete the primary admin account");
    }

    await auditLog(ctx, {
      userId: args.callerRole || "system",
      userName: args.callerRole || "System",
      action: "delete_user",
      target: user && "username" in user ? (user as any).username : "unknown",
      details: user && "name" in user ? `Deleted user: ${(user as any).name}` : "User deleted",
    });

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
