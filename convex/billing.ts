import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

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
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.number(),
    total: v.number(),
    paidAmount: v.number(),
    paymentMethod: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "receptionist");

    const status =
      args.paidAmount >= args.total
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
      createdBy: user.username,
      status,
      date: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
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
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "receptionist");

    const bill = await ctx.db.get(args.id);
    if (!bill) throw new Error("Bill not found");

    const newPaid = bill.paidAmount + args.amount;
    const status = newPaid >= bill.total ? "paid" : "partial";

    await ctx.db.patch(args.id, {
      paidAmount: newPaid,
      status,
      paymentMethod: args.paymentMethod,
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
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
