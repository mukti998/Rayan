import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

// ── Beds ──

// List beds
export const listBeds = query({
  args: {
    ward: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let beds = await ctx.db.query("beds").collect();

    if (args.ward && args.ward !== "all") {
      beds = beds.filter((b) => b.ward === args.ward);
    }
    if (args.status && args.status !== "all") {
      beds = beds.filter((b) => b.status === args.status);
    }

    return beds.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber));
  },
});

// Bed stats by ward
export const bedStats = query({
  args: {},
  handler: async (ctx) => {
    const beds = await ctx.db.query("beds").collect();
    const wards = [...new Set(beds.map((b) => b.ward))].sort();

    return wards.map((ward) => {
      const wardBeds = beds.filter((b) => b.ward === ward);
      return {
        ward,
        total: wardBeds.length,
        available: wardBeds.filter((b) => b.status === "available").length,
        occupied: wardBeds.filter((b) => b.status === "occupied").length,
        maintenance: wardBeds.filter((b) => b.status === "maintenance").length,
      };
    });
  },
});

// Create bed — admin only
export const createBed = mutation({
  args: {
    bedNumber: v.string(),
    ward: v.string(),
    bedType: v.union(
      v.literal("general"),
      v.literal("semi-private"),
      v.literal("private"),
      v.literal("icu")
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    // Check for duplicate bed number
    const existing = await ctx.db
      .query("beds")
      .withIndex("by_bedNumber", (q) => q.eq("bedNumber", args.bedNumber))
      .unique();
    if (existing) {
      throw new Error("Bed number already exists");
    }

    const id = await ctx.db.insert("beds", {
      bedNumber: args.bedNumber,
      ward: args.ward,
      bedType: args.bedType,
      status: "available",
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_bed",
      target: args.bedNumber,
      details: `Bed ${args.bedNumber} created in ${args.ward} (${args.bedType})`,
    });

    return id;
  },
});

// Update bed status — admin only
export const updateBed = mutation({
  args: {
    id: v.id("beds"),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("occupied"),
        v.literal("maintenance")
      )
    ),
    bedType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("semi-private"),
        v.literal("private"),
        v.literal("icu")
      )
    ),
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

// Delete bed — admin only
export const removeBed = mutation({
  args: {
    id: v.id("beds"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const bed = await ctx.db.get(args.id);
    if (bed && bed.status === "occupied") {
      throw new Error("Cannot delete an occupied bed — discharge the patient first");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ── Admissions ──

// List admissions
export const listAdmissions = query({
  args: {
    status: v.optional(v.string()),
    ward: v.optional(v.string()),
    patientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let admissions = await ctx.db.query("admissions").collect();

    if (args.status && args.status !== "all") {
      admissions = admissions.filter((a) => a.status === args.status);
    }
    if (args.ward && args.ward !== "all") {
      admissions = admissions.filter((a) => a.ward === args.ward);
    }
    if (args.patientId) {
      admissions = admissions.filter((a) => a.patientId === args.patientId);
    }

    return admissions.sort((a, b) => {
      // Active first, then by admission date descending
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return b.admissionDate.localeCompare(a.admissionDate);
    });
  },
});

// Get active admissions count by ward
export const activeAdmissions = query({
  args: {},
  handler: async (ctx) => {
    const admissions = await ctx.db
      .query("admissions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return admissions;
  },
});

// Admit patient — admin, doctor, nurse, or receptionist
export const admitPatient = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    ward: v.string(),
    bedId: v.optional(v.id("beds")),
    bedNumber: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    notes: v.optional(v.string()),
    doctorName: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor", "nurse", "receptionist");

    // Check if patient already has an active admission
    const existingAdmissions = await ctx.db
      .query("admissions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    const activeAdmission = existingAdmissions.find(
      (a) => a.status === "active"
    );
    if (activeAdmission) {
      throw new Error("Patient already has an active admission");
    }

    // Create admission
    const admissionId = await ctx.db.insert("admissions", {
      patientId: args.patientId,
      patientName: args.patientName,
      bedId: args.bedId,
      bedNumber: args.bedNumber,
      ward: args.ward,
      admissionDate: new Date().toISOString().split("T")[0],
      admittedBy: user.name,
      admittedById: String(user._id),
      status: "active",
      diagnosis: args.diagnosis,
      notes: args.notes,
      doctorName: args.doctorName,
    });

    // Update bed status if a bed is assigned
    if (args.bedId) {
      await ctx.db.patch(args.bedId, {
        status: "occupied",
        currentPatientId: args.patientId,
        currentAdmissionId: String(admissionId),
      });
    }

    // Update patient status to active
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
    if (patients.length > 0) {
      await ctx.db.patch(patients[0]._id, { status: "active" });
    }

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "admit_patient",
      target: args.patientId,
      details: `Admitted ${args.patientName} to ${args.ward}${args.bedNumber ? ` bed ${args.bedNumber}` : ""}`,
    });

    return admissionId;
  },
});

// Discharge patient
export const dischargePatient = mutation({
  args: {
    admissionId: v.id("admissions"),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor", "nurse");

    const admission = await ctx.db.get(args.admissionId);
    if (!admission) throw new Error("Admission not found");
    if (admission.status !== "active") {
      throw new Error("This admission is not active");
    }

    // Update admission
    await ctx.db.patch(args.admissionId, {
      status: "discharged",
      dischargeDate: new Date().toISOString().split("T")[0],
      notes: args.notes || admission.notes,
    });

    // Free the bed
    if (admission.bedId) {
      await ctx.db.patch(admission.bedId, {
        status: "available",
        currentPatientId: undefined,
        currentAdmissionId: undefined,
      });
    }

    // Check if patient has any other active admissions
    const otherAdmissions = await ctx.db
      .query("admissions")
      .withIndex("by_patient", (q) =>
        q.eq("patientId", admission.patientId)
      )
      .collect();
    const hasOtherActive = otherAdmissions.some(
      (a) => a._id !== args.admissionId && a.status === "active"
    );

    // If no other active admissions, update patient status
    if (!hasOtherActive) {
      const patients = await ctx.db
        .query("patients")
        .withIndex("by_patientId", (q) =>
          q.eq("patientId", admission.patientId)
        )
        .collect();
      if (patients.length > 0) {
        await ctx.db.patch(patients[0]._id, { status: "discharged" });
      }
    }

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "discharge_patient",
      target: admission.patientId,
      details: `Discharged ${admission.patientName} from ${admission.ward}`,
    });

    return { success: true };
  },
});

// Transfer patient to different ward/bed
export const transferPatient = mutation({
  args: {
    admissionId: v.id("admissions"),
    newWard: v.string(),
    newBedId: v.optional(v.id("beds")),
    newBedNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin", "doctor", "nurse");

    const admission = await ctx.db.get(args.admissionId);
    if (!admission) throw new Error("Admission not found");
    if (admission.status !== "active") {
      throw new Error("This admission is not active");
    }

    // Free old bed
    if (admission.bedId) {
      await ctx.db.patch(admission.bedId, {
        status: "available",
        currentPatientId: undefined,
        currentAdmissionId: undefined,
      });
    }

    // Update admission
    await ctx.db.patch(args.admissionId, {
      ward: args.newWard,
      bedId: args.newBedId,
      bedNumber: args.newBedNumber,
      notes: args.notes || admission.notes,
    });

    // Occupy new bed
    if (args.newBedId) {
      await ctx.db.patch(args.newBedId, {
        status: "occupied",
        currentPatientId: admission.patientId,
        currentAdmissionId: String(args.admissionId),
      });
    }

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "transfer_patient",
      target: admission.patientId,
      details: `Transferred ${admission.patientName} from ${admission.ward} to ${args.newWard}`,
    });

    return { success: true };
  },
});
