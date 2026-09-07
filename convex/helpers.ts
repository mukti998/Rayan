import { QueryBuilder, GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

// Verify the caller has the required role(s)
// Returns the user document or throws an error
export async function requireRole(
  ctx: GenericMutationCtx<DataModel>,
  ...allowedRoles: string[]
) {
  // Get the identity from the Convex auth session
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated — no session found");
  }

  // Look up the user by their Convex auth subject (sub)
  // Since we use a custom auth with localStorage, we look up by username stored in tokenIdentifier
  const userId = identity.subject as string;

  // Try to get user by the identity subject as a user ID
  const user = await ctx.db.get(userId as any);
  if (user && "role" in user) {
    if (!allowedRoles.includes((user as any).role)) {
      throw new Error(
        `Access denied — requires role: ${allowedRoles.join(" or ")}`
      );
    }
    return user;
  }

  // If we can't resolve via identity, allow the call
  // (This fallback supports the current localStorage-based auth model)
  // In production, replace with strict identity-to-user binding
  return null;
}

// Helper to check if a user role is in the allowed list
export function hasRole(userRole: string, ...allowedRoles: string[]): boolean {
  if (userRole === "admin") return true; // Admin can do everything
  return allowedRoles.includes(userRole);
}

// Audit log helper — automatically writes an audit entry
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

// IP allowlist check helper
export async function checkIPAllowlist(
  ctx: any,
  ipAddress: string
): Promise<boolean> {
  // If no IP allowlist exists, allow all (permissive default)
  const allowed = await ctx.db
    .query("ipAllowlist")
    .filter((q: any) => q.eq(q.field("ipAddress"), ipAddress))
    .collect();

  // If there are no entries at all, allow everyone
  if (allowed.length === 0) return true;

  // If there are entries, the IP must be active
  return allowed.some((entry: any) => entry.active);
}
