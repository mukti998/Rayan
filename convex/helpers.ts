import { GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

/**
 * Validate a session token and return the authenticated user document.
 * Throws if the session is invalid, expired, or the user is deactivated.
 *
 * This is the ONLY way mutations should verify caller identity.
 * Never trust callerRole, callerId, or callerName from the client.
 */
export async function authenticate(
  ctx: GenericMutationCtx<DataModel>,
  sessionToken: string
) {
  // Look up the session by token
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .collect();

  if (sessions.length === 0) {
    throw new Error("Invalid session — please log in again");
  }

  const session = sessions[0];

  // Session expires after 24 hours
  const SESSION_TTL = 24 * 60 * 60 * 1000;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    await ctx.db.delete(session._id);
    throw new Error("Session expired — please log in again");
  }

  // Look up the user
  const user = await ctx.db.get(session.userId);
  if (!user) {
    // Orphaned session — delete it
    await ctx.db.delete(session._id);
    throw new Error("User account not found");
  }

  if (!user.active) {
    // Deactivated user — delete their sessions
    const staleSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of staleSessions) {
      await ctx.db.delete(s._id);
    }
    throw new Error("Account is deactivated — contact administrator");
  }

  return user;
}

/**
 * Check if the authenticated user has one of the allowed roles.
 * Admin always has access.
 * Returns true if authorized, throws if not.
 */
export function authorize(
  user: { role: string },
  ...allowedRoles: string[]
) {
  if (user.role === "admin") return true; // Admin can do everything
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied — requires role: ${allowedRoles.join(" or ")}`
    );
  }
  return true;
}

/**
 * Write an audit log entry.
 */
export async function auditLog(
  ctx: GenericMutationCtx<DataModel>,
  args: {
    userId: string;
    userName: string;
    action: string;
    target: string;
    details?: string;
  }
) {
  await ctx.db.insert("auditLog", {
    userId: args.userId,
    userName: args.userName,
    action: args.action,
    target: args.target,
    details: args.details,
    timestamp: Date.now(),
  });
}
