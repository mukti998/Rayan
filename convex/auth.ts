import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

// Hash a password with bcrypt
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Legacy SHA-256 hash (for migrating existing passwords)
async function hashPasswordSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "clinic_manager_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify a password against a stored hash, with automatic migration
// Returns { valid, migratedHash } — if migratedHash is set, the caller should update the DB
async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; migratedHash?: string }> {
  // Try bcrypt first (new passwords)
  const bcryptMatch = await bcrypt.compare(password, storedHash);
  if (bcryptMatch) {
    return { valid: true };
  }

  // Try legacy SHA-256 (old passwords — for migration)
  const sha256Hash = await hashPasswordSHA256(password);
  if (sha256Hash === storedHash) {
    // Password matches old hash — upgrade to bcrypt
    const newHash = await hashPassword(password);
    return { valid: true, migratedHash: newHash };
  }

  return { valid: false };
}

// Generate a cryptographically random session token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Login mutation — creates a session and returns a token
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

    const result = await verifyPassword(args.password, user.passwordHash);
    if (!result.valid) {
      throw new Error("Invalid username or password");
    }

    // Auto-migrate old SHA-256 hash to bcrypt
    if (result.migratedHash) {
      await ctx.db.patch(user._id, { passwordHash: result.migratedHash });
    }

    // Create a session
    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      createdAt: Date.now(),
    });

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
      sessionToken: token,
      userId: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
    };
  },
});

// Logout — delete the session
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Validate an existing session (used on app load to check if session is still valid)
export const validateSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .collect();

    if (sessions.length === 0) return null;

    const session = sessions[0];
    const SESSION_TTL = 24 * 60 * 60 * 1000;
    if (Date.now() - session.createdAt > SESSION_TTL) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.active) return null;

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
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session and check admin role
    const { authenticate, authorize } = await import("./helpers");
    const caller = await authenticate(ctx, args.sessionToken);
    authorize(caller, "admin");

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

    // Audit log
    await ctx.db.insert("auditLog", {
      userId: caller._id,
      userName: caller.name,
      action: "create_user",
      target: args.username,
      details: `Created user: ${args.name} (${args.role})`,
      timestamp: Date.now(),
    });

    return userId;
  },
});

// Change password — requires session token
export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { authenticate } = await import("./helpers");
    const caller = await authenticate(ctx, args.sessionToken);

    const result = await verifyPassword(args.currentPassword, caller.passwordHash);
    if (!result.valid) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(args.newPassword);
    await ctx.db.patch(caller._id, { passwordHash: newHash });

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
