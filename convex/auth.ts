import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Simple password hash using Web Crypto API (works in Convex runtime)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "clinic_manager_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Login mutation
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      throw new Error("Invalid username or password");
    }

    if (!user.active) {
      throw new Error("Account is deactivated. Contact administrator.");
    }

    const passwordHash = await hashPassword(args.password);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Invalid username or password");
    }

    // Log the login
    await ctx.db.insert("auditLog", {
      userId: user._id,
      userName: user.name,
      action: "login",
      target: "auth",
      details: "User logged in successfully",
      timestamp: Date.now(),
    });

    return {
      userId: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
    };
  },
});

// Register new user (admin only)
export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("doctor"),
      v.literal("nurse"),
      v.literal("pharmacist"),
      v.literal("receptionist"),
      v.literal("lab Technician")
    ),
    department: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existing) {
      throw new Error("Username already exists");
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      username: args.username,
      passwordHash,
      name: args.name,
      email: args.email,
      role: args.role,
      department: args.department,
      phone: args.phone,
      active: true,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Change password
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentHash = await hashPassword(args.currentPassword);
    if (currentHash !== user.passwordHash) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, { passwordHash: newHash });

    return { success: true };
  },
});

// Get current user info
export const getCurrentUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      userId: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      active: user.active,
    };
  },
});
