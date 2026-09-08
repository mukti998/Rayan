import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

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
      prescriptions = prescriptions.filter(
        (p) => p.patientId === args.patientId
      );
    }
    if (args.doctorId) {
      prescriptions = prescriptions.filter(
        (p) => p.doctorId === args.doctorId
      );
    }
    if (args.status && args.status !== "all") {
      prescriptions = prescriptions.filter((p) => p.status === args.status);
    }

    return prescriptions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create prescription — doctor or admin only
export const create = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    date: v.string(),
    medications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
        duration: v.string(),
        instructions: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor");

    const id = await ctx.db.insert("prescriptions", {
      patientId: args.patientId,
      patientName: args.patientName,
      doctorId: args.doctorId,
      doctorName: args.doctorName,
      date: args.date,
      medications: args.medications,
      notes: args.notes,
      status: "active",
      createdAt: Date.now(),
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_prescription",
      target: args.patientId,
      details: `Prescription issued for ${args.patientName} — ${args.medications.length} medication(s)`,
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
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);

    // Role-based checks using DB role
    if (args.status === "dispensed") {
      authorize(user, "admin", "pharmacist");
    } else if (args.status === "completed" || args.status === "cancelled") {
      authorize(user, "admin", "doctor");
    }

    const updates: any = { status: args.status };
    if (args.status === "dispensed") {
      updates.dispensedAt = Date.now();
      updates.dispensedBy = args.dispensedBy || user.name;
    }
    await ctx.db.patch(args.id, updates);

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: `prescription_${args.status}`,
      target: `rx_${args.id}`,
      details: `Prescription status changed to ${args.status}`,
    });

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
