import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Add medication
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("medications", {
      ...args,
      active: true,
    });
    return id;
  },
});

// Update medication stock
export const updateStock = mutation({
  args: {
    id: v.id("medications"),
    stockQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stockQuantity: args.stockQuantity });
    return { success: true };
  },
});

// Update medication
export const update = mutation({
  args: {
    id: v.id("medications"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stockQuantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
    active: v.optional(v.boolean()),
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

// Get medication categories
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const meds = await ctx.db.query("medications").collect();
    return [...new Set(meds.map((m) => m.category))].sort();
  },
});
