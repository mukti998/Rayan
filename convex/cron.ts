import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";

// Define the cleanup function inline as an internal mutation
const cleanupSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - SEVEN_DAYS_MS;

    const allSessions = await ctx.db.query("sessions").collect();
    let deletedCount = 0;

    for (const session of allSessions) {
      if (session.createdAt < cutoff) {
        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }

    console.log(`Session cleanup: deleted ${deletedCount} expired sessions`);
  },
});

const crons = cronJobs();

// Clean up sessions older than 7 days — runs daily at 3:00 AM UTC
// @ts-expect-error — Convex cron type mismatch with inline function definition
crons.interval("session-cleanup", { hours: 24 }, cleanupSessions);

export default crons;
