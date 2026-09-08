import { query } from "./_generated/server";
import { v } from "convex/values";

// Full analytics report for a date range
export const analytics = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // ── Appointments ──
    const appointments = await ctx.db.query("appointments").collect();
    const rangeAppts = appointments.filter(
      (a) => a.date >= args.startDate && a.date <= args.endDate
    );

    // ── Patients ──
    const patients = await ctx.db.query("patients").collect();
    const rangePatients = patients.filter((p) => {
      const regDate = new Date(p.registrationDate).toISOString().split("T")[0];
      return regDate >= args.startDate && regDate <= args.endDate;
    });

    // ── Billing ──
    const bills = await ctx.db.query("billing").collect();
    const rangeBills = bills.filter(
      (b) => b.date >= args.startDate && b.date <= args.endDate
    );

    // ── Vitals ──
    const vitals = await ctx.db.query("vitals").collect();
    const rangeVitals = vitals.filter((v) => {
      const d = new Date(v.timestamp).toISOString().split("T")[0];
      return d >= args.startDate && d <= args.endDate;
    });

    // ── Lab Results ──
    const labResults = await ctx.db.query("labResults").collect();
    const rangeLab = labResults.filter(
      (l) => l.orderedDate >= args.startDate && l.orderedDate <= args.endDate
    );

    // ── Admissions ──
    const admissions = await ctx.db.query("admissions").collect();
    const rangeAdmissions = admissions.filter(
      (a) => a.admissionDate >= args.startDate && a.admissionDate <= args.endDate
    );

    // ── Prescriptions ──
    const prescriptions = await ctx.db.query("prescriptions").collect();
    const rangePrescriptions = prescriptions.filter(
      (p) => p.date >= args.startDate && p.date <= args.endDate
    );

    // ── Medications ──
    const medications = await ctx.db.query("medications").collect();
    const lowStock = medications.filter((m) => m.stockQuantity <= m.reorderLevel);

    return {
      period: { startDate: args.startDate, endDate: args.endDate },
      summary: {
        totalAppointments: rangeAppts.length,
        completedAppointments: rangeAppts.filter((a) => a.status === "completed").length,
        cancelledAppointments: rangeAppts.filter((a) => a.status === "cancelled").length,
        noShowAppointments: rangeAppts.filter((a) => a.status === "no-show").length,
        newPatients: rangePatients.length,
        totalPatientsNow: patients.length,
        totalBilled: rangeBills.reduce((s, b) => s + b.total, 0),
        totalCollected: rangeBills.reduce((s, b) => s + b.paidAmount, 0),
        pendingBills: rangeBills.filter((b) => b.status === "pending").length,
        totalVitalsRecorded: rangeVitals.length,
        abnormalVitals: rangeVitals.filter(
          (v) =>
            v.bloodPressureSystolic > 140 ||
            v.bloodPressureDiastolic > 90 ||
            v.oxygenSaturation < 94 ||
            v.temperature > 37.8
        ).length,
        labTestsOrdered: rangeLab.length,
        labTestsCompleted: rangeLab.filter((l) => l.status === "completed").length,
        admissions: rangeAdmissions.length,
        discharges: rangeAdmissions.filter((a) => a.status === "discharged").length,
        prescriptionsIssued: rangePrescriptions.length,
        lowStockMedications: lowStock.length,
      },
      // Breakdown by day for sparkline
      dailyAppointments: groupByDay(rangeAppts, (a) => a.date),
      dailyBilling: groupByDay(rangeBills, (b) => b.date),
      // Top doctors
      topDoctors: getTopDoctors(rangeAppts),
      // Ward occupancy
      wardAdmissions: getWardBreakdown(rangeAdmissions),
    };
  },
});

function groupByDay<T>(items: T[], dateFn: (item: T) => string): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const item of items) {
    const d = dateFn(item);
    grouped[d] = (grouped[d] || 0) + 1;
  }
  return grouped;
}

function getTopDoctors(appointments: any[]) {
  const counts: Record<string, number> = {};
  for (const a of appointments) {
    counts[a.doctorName] = (counts[a.doctorName] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function getWardBreakdown(admissions: any[]) {
  const counts: Record<string, number> = {};
  for (const a of admissions) {
    counts[a.ward] = (counts[a.ward] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([ward, count]) => ({ ward, count }));
}
