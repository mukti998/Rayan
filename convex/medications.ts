import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasRole, auditLog } from "./helpers";

// List all medications
export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let medications = await ctx.db.query("medications").collect();

    if (args.category && args.category !== "all") {
      medications = medications.filter((m) => m.category === args.category);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      medications = medications.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.category.toLowerCase().includes(search)
      );
    }

    return medications;
  },
});

// Get low stock medications
export const lowStock = query({
  args: {},
  handler: async (ctx) => {
    const meds = await ctx.db.query("medications").collect();
    return meds.filter((m) => m.stockQuantity <= m.reorderLevel);
  },
});

// Add medication — admin or pharmacist only
export const create = mutation({
  args: {
    name: v.string(),
    genericName: v.optional(v.string()),
    category: v.string(),
    dosageForm: v.string(),
    strength: v.string(),
    manufacturer: v.optional(v.string()),
    stockQuantity: v.number(),
    unitPrice: v.number(),
    reorderLevel: v.number(),
    expiryDate: v.string(),
    batchNumber: v.optional(v.string()),
    sideEffects: v.optional(v.array(v.string())),
    contraindications: v.optional(v.array(v.string())),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only admin or pharmacist can add medications
    if (args.callerRole && !hasRole(args.callerRole, "admin", "pharmacist")) {
      throw new Error("Access denied — only admin and pharmacists can add medications");
    }

    const id = await ctx.db.insert("medications", {
      name: args.name,
      genericName: args.genericName,
      category: args.category,
      dosageForm: args.dosageForm,
      strength: args.strength,
      manufacturer: args.manufacturer,
      stockQuantity: args.stockQuantity,
      unitPrice: args.unitPrice,
      reorderLevel: args.reorderLevel,
      expiryDate: args.expiryDate,
      batchNumber: args.batchNumber,
      sideEffects: args.sideEffects,
      contraindications: args.contraindications,
      active: true,
    });

    await auditLog(ctx, {
      userId: "system",
      userName: args.callerRole || "System",
      action: "add_medication",
      target: args.name,
      details: `Medication added: ${args.name} ${args.strength} — stock: ${args.stockQuantity}`,
    });

    return id;
  },
});

// Update medication stock — admin or pharmacist only
export const updateStock = mutation({
  args: {
    id: v.id("medications"),
    stockQuantity: v.number(),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check
    if (args.callerRole && !hasRole(args.callerRole, "admin", "pharmacist")) {
      throw new Error("Access denied — only admin and pharmacists can update stock");
    }

    const med = await ctx.db.get(args.id);
    const oldStock = med && "stockQuantity" in med ? (med as any).stockQuantity : 0;

    await ctx.db.patch(args.id, { stockQuantity: args.stockQuantity });

    await auditLog(ctx, {
      userId: "system",
      userName: args.callerRole || "System",
      action: "update_stock",
      target: med && "name" in med ? (med as any).name : "unknown",
      details: `Stock updated from ${oldStock} to ${args.stockQuantity}`,
    });

    return { success: true };
  },
});

// Update medication — admin or pharmacist only
export const update = mutation({
  args: {
    id: v.id("medications"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stockQuantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
    active: v.optional(v.boolean()),
    callerRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check
    if (args.callerRole && !hasRole(args.callerRole, "admin", "pharmacist")) {
      throw new Error("Access denied — only admin and pharmacists can update medications");
    }

    const { id, callerRole, ...updates } = args;
    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleaned);
    return { success: true };
  },
});

// Get medication categories
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const meds = await ctx.db.query("medications").collect();
    return [...new Set(meds.map((m) => m.category))].sort();
  },
});
