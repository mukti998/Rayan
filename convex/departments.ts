import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

// List departments
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("departments").collect();
  },
});

// Get department by name
export const get = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const depts = await ctx.db.query("departments").collect();
    return depts.find((d) => d.name === args.name) || null;
  },
});

// Create department — admin only
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    headDoctorId: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    // Check for duplicate name
    const existing = await ctx.db.query("departments").collect();
    if (existing.some((d) => d.name.toLowerCase() === args.name.toLowerCase())) {
      throw new Error("Department name already exists");
    }

    const id = await ctx.db.insert("departments", {
      name: args.name,
      description: args.description,
      phone: args.phone,
      location: args.location,
      headDoctorId: args.headDoctorId,
      active: true,
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_department",
      target: args.name,
      details: `Department created: ${args.name}`,
    });

    return id;
  },
});

// Update department — admin only
export const update = mutation({
  args: {
    id: v.id("departments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    headDoctorId: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const { id, sessionToken, ...updates } = args;
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleaned);
    return { success: true };
  },
});

// Delete department — admin only
export const remove = mutation({
  args: {
    id: v.id("departments"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const dept = await ctx.db.get(args.id);

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "delete_department",
      target: dept && "name" in dept ? (dept as any).name : String(args.id),
      details: "Department deleted",
    });

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
