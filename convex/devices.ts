import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authenticate, authorize, auditLog } from "./helpers";

// List devices
export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let devices = await ctx.db.query("devices").collect();

    if (args.status && args.status !== "all") {
      devices = devices.filter((d) => d.status === args.status);
    }
    if (args.department && args.department !== "all") {
      devices = devices.filter((d) => d.department === args.department);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.deviceName.toLowerCase().includes(search) ||
          d.serialNumber.toLowerCase().includes(search) ||
          d.deviceType.toLowerCase().includes(search)
      );
    }

    return devices;
  },
});

// Get device
export const get = query({
  args: { id: v.id("devices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Register device — starts as "inactive" (pending approval), admin only
export const create = mutation({
  args: {
    deviceName: v.string(),
    deviceType: v.string(),
    serialNumber: v.string(),
    department: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    // Check serial number uniqueness
    const existing = await ctx.db.query("devices").collect();
    if (existing.some((d) => d.serialNumber === args.serialNumber)) {
      throw new Error("Serial number already exists");
    }

    const id = await ctx.db.insert("devices", {
      deviceName: args.deviceName,
      deviceType: args.deviceType,
      serialNumber: args.serialNumber,
      department: args.department,
      purchaseDate: args.purchaseDate,
      ipAddress: args.ipAddress,
      notes: args.notes,
      status: "inactive",
      createdAt: Date.now(),
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "register_device",
      target: args.serialNumber,
      details: `Device registered: ${args.deviceName} (${args.deviceType}) — pending approval`,
    });

    return id;
  },
});

// Approve device (admin only)
export const approve = mutation({
  args: {
    id: v.id("devices"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    await ctx.db.patch(args.id, {
      status: "active",
      approvedBy: user.name,
      approvedAt: Date.now(),
    });

    const device = await ctx.db.get(args.id);
    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "approve_device",
      target:
        device && "serialNumber" in device
          ? (device as any).serialNumber
          : String(args.id),
      details: `Device approved by ${user.name}`,
    });

    return { success: true };
  },
});

// Reject device (admin only)
export const reject = mutation({
  args: {
    id: v.id("devices"),
    reason: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const device = await ctx.db.get(args.id);
    const note = args.reason
      ? `Rejected: ${args.reason}`
      : "Rejected by administrator";

    await ctx.db.patch(args.id, {
      status: "inactive",
      notes: note,
    });

    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "reject_device",
      target:
        device && "serialNumber" in device
          ? (device as any).serialNumber
          : String(args.id),
      details: note,
    });

    return { success: true };
  },
});

// Update device
export const update = mutation({
  args: {
    id: v.id("devices"),
    deviceName: v.optional(v.string()),
    department: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("maintenance"),
        v.literal("inactive"),
        v.literal("retired")
      )
    ),
    assignedTo: v.optional(v.string()),
    lastMaintenance: v.optional(v.string()),
    nextMaintenance: v.optional(v.string()),
    notes: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
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

// Delete device
export const remove = mutation({
  args: {
    id: v.id("devices"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authenticate(ctx, args.sessionToken);
    authorize(user, "admin");

    const device = await ctx.db.get(args.id);
    await auditLog(ctx, {
      userId: String(user._id),
      userName: user.name,
      action: "remove_device",
      target:
        device && "serialNumber" in device
          ? (device as any).serialNumber
          : String(args.id),
      details: `Device removed: ${device && "deviceName" in device ? (device as any).deviceName : "unknown"}`,
    });

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Device stats
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db.query("devices").collect();
    return {
      total: devices.length,
      active: devices.filter((d) => d.status === "active").length,
      maintenance: devices.filter((d) => d.status === "maintenance").length,
      inactive: devices.filter((d) => d.status === "inactive").length,
    };
  },
});
