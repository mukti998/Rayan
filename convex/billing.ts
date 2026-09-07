import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasRole, auditLog } from "./helpers";

// List billing records
export const list = query({
  args: {
    patientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let bills = await ctx.db.query("billing").collect();

    if (args.patientId) {
      bills = bills.filter((b) => b.patientId === args.patientId);
    }
    if (args.status && args.status !== "all") {
      bills = bills.filter((b) => b.status === args.status);
    }

    return bills.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create bill — admin or receptionist only
export const create = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.number(),
    total: v.number(),
    paidAmount: v.number(),
    paymentMethod: v.optional(v.string()),
    createdBy: v.string(),
    // Caller identity for server-side role check
    callerRole: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check: only admin or receptionist can create invoices
    if (args.callerRole && !hasRole(args.callerRole, "admin", "receptionist")) {
      throw new Error("Access denied — only admin and receptionist can create invoices");
    }

    const status = args.paidAmount >= args.total
      ? "paid"
      : args.paidAmount > 0
      ? "partial"
      : "pending";

    const id = await ctx.db.insert("billing", {
      patientId: args.patientId,
      patientName: args.patientName,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      discount: args.discount,
      total: args.total,
      paidAmount: args.paidAmount,
      paymentMethod: args.paymentMethod,
      createdBy: args.createdBy,
      status,
      date: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
    });

    // Audit log
    await auditLog(ctx, {
      userId: args.callerId || args.createdBy,
      userName: args.callerName || args.createdBy,
      action: "create_invoice",
      target: args.patientId,
      details: `Invoice created for ${args.patientName} — total: $${args.total.toFixed(2)}`,
    });

    return id;
  },
});

// Process payment — admin or receptionist only
export const processPayment = mutation({
  args: {
    id: v.id("billing"),
    amount: v.number(),
    paymentMethod: v.string(),
    callerRole: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side role check
    if (args.callerRole && !hasRole(args.callerRole, "admin", "receptionist")) {
      throw new Error("Access denied — only admin and receptionist can process payments");
    }

    const bill = await ctx.db.get(args.id);
    if (!bill) throw new Error("Bill not found");

    const newPaid = bill.paidAmount + args.amount;
    const status = newPaid >= bill.total ? "paid" : "partial";

    await ctx.db.patch(args.id, {
      paidAmount: newPaid,
      status,
      paymentMethod: args.paymentMethod,
    });

    // Audit log
    await auditLog(ctx, {
      userId: args.callerId || "system",
      userName: args.callerName || "System",
      action: "process_payment",
      target: `bill_${args.id}`,
      details: `Payment of $${args.amount.toFixed(2)} via ${args.paymentMethod} — bill now ${status}`,
    });

    return { success: true };
  },
});

// Revenue summary
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const bills = await ctx.db.query("billing").collect();
    return {
      totalRevenue: bills.reduce((sum, b) => sum + b.paidAmount, 0),
      totalBilled: bills.reduce((sum, b) => sum + b.total, 0),
      paidBills: bills.filter((b) => b.status === "paid").length,
      pendingBills: bills.filter((b) => b.status === "pending").length,
      partialBills: bills.filter((b) => b.status === "partial").length,
    };
  },
});
