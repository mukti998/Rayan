import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

// List shifts
export const list = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    ward: v.optional(v.string()),
    nurseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let shifts = await ctx.db.query("shifts").collect();

    if (args.startDate) {
      shifts = shifts.filter((s) => s.date >= args.startDate!);
    }
    if (args.endDate) {
      shifts = shifts.filter((s) => s.date <= args.endDate!);
    }
    if (args.ward && args.ward !== "all") {
      shifts = shifts.filter((s) => s.ward === args.ward);
    }
    if (args.nurseId) {
      shifts = shifts.filter((s) => s.nurseId === args.nurseId);
    }

    return shifts.sort((a, b) =>
      a.date.localeCompare(b.date) || a.shiftStart.localeCompare(b.shiftStart)
    );
  },
});

// Get shifts grouped by date (for calendar view)
export const byDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    ward: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let shifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) =>
        q.gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    if (args.ward && args.ward !== "all") {
      shifts = shifts.filter((s) => s.ward === args.ward);
    }

    // Group by date
    const grouped: Record<string, typeof shifts> = {};
    for (const shift of shifts) {
      if (!grouped[shift.date]) grouped[shift.date] = [];
      grouped[shift.date].push(shift);
    }

    return grouped;
  },
});

// Create shift — admin only
export const create = mutation({
  args: {
    nurseId: v.string(),
    nurseName: v.string(),
    ward: v.string(),
    date: v.string(),
    shiftType: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("night")
    ),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    // Check for conflicting shift (same nurse, same date, overlapping shift)
    const existing = await ctx.db
      .query("shifts")
      .withIndex("by_nurse", (q) =>
        q.eq("nurseId", args.nurseId).eq("date", args.date)
      )
      .collect();
    if (existing.length > 0) {
      throw new Error(
        `${args.nurseName} already has a shift on ${args.date}`
      );
    }

    // Set times based on shift type
    const times: Record<string, { start: string; end: string }> = {
      morning: { start: "07:00", end: "15:00" },
      afternoon: { start: "15:00", end: "23:00" },
      night: { start: "23:00", end: "07:00" },
    };

    const id = await ctx.db.insert("shifts", {
      nurseId: args.nurseId,
      nurseName: args.nurseName,
      ward: args.ward,
      date: args.date,
      shiftType: args.shiftType,
      shiftStart: times[args.shiftType].start,
      shiftEnd: times[args.shiftType].end,
      status: "scheduled",
      notes: args.notes,
      createdBy: user.username,
      createdAt: Date.now(),
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "create_shift",
      target: args.nurseId,
      details: `${args.nurseName} scheduled for ${args.shiftType} shift on ${args.date} in ${args.ward}`,
    });

    return id;
  },
});

// Update shift status
export const updateStatus = mutation({
  args: {
    id: v.id("shifts"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("absent")
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await authenticate(ctx, args.sessionToken);

    await ctx.db.patch(args.id, { status: args.status });
    return { success: true };
  },
});

// Delete shift — admin only
export const remove = mutation({
  args: {
    id: v.id("shifts"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Quick-fill: create a week of shifts for a nurse — admin only
export const createWeek = mutation({
  args: {
    nurseId: v.string(),
    nurseName: v.string(),
    ward: v.string(),
    startDate: v.string(),
    pattern: v.array(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("night"),
        v.literal("off")
      )
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const times: Record<string, { start: string; end: string }> = {
      morning: { start: "07:00", end: "15:00" },
      afternoon: { start: "15:00", end: "23:00" },
      night: { start: "23:00", end: "07:00" },
    };

    const created: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < args.pattern.length && i < 7; i++) {
      const shiftType = args.pattern[i];
      if (shiftType === "off") continue;

      // Calculate date
      const date = new Date(args.startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Check for conflict
      const existing = await ctx.db
        .query("shifts")
        .withIndex("by_nurse", (q) =>
          q.eq("nurseId", args.nurseId).eq("date", dateStr)
        )
        .collect();
      if (existing.length > 0) {
        skipped.push(dateStr);
        continue;
      }

      await ctx.db.insert("shifts", {
        nurseId: args.nurseId,
        nurseName: args.nurseName,
        ward: args.ward,
        date: dateStr,
        shiftType,
        shiftStart: times[shiftType].start,
        shiftEnd: times[shiftType].end,
        status: "scheduled",
        createdBy: user.username,
        createdAt: Date.now(),
      });
      created.push(dateStr);
    }

    return {
      created: created.length,
      skipped: skipped.length,
      skippedDates: skipped,
    };
  },
});
