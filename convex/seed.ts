import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed the database with default admin user and sample data
export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "admin"))
      .unique();

    if (existingAdmin) {
      return "Database already seeded";
    }

    // Simple password hash
    async function hashPassword(password: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + "clinic_manager_salt_2024");
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    const defaultPassword = await hashPassword("admin123");
    const doctorPassword = await hashPassword("doctor123");
    const nursePassword = await hashPassword("nurse123");
    const pharmacistPassword = await hashPassword("pharm123");
    const receptionPassword = await hashPassword("recep123");

    // Create departments
    const deptIds: Record<string, string> = {};
    const departments = [
      { name: "General Medicine", description: "Primary care and internal medicine", active: true },
      { name: "Surgery", description: "Surgical procedures and operations", active: true },
      { name: "Pediatrics", description: "Child healthcare", active: true },
      { name: "Orthopedics", description: "Bone and joint care", active: true },
      { name: "Cardiology", description: "Heart and cardiovascular care", active: true },
      { name: "Pharmacy", description: "Medication management and dispensing", active: true },
      { name: "Laboratory", description: "Diagnostic testing and analysis", active: true },
      { name: "Emergency", description: "Emergency and urgent care", active: true },
    ];

    for (const dept of departments) {
      const id = await ctx.db.insert("departments", dept);
      deptIds[dept.name] = id;
    }

    // Create admin user
    await ctx.db.insert("users", {
      username: "admin",
      passwordHash: defaultPassword,
      name: "System Administrator",
      email: "admin@clinicmanager.local",
      role: "admin",
      department: "Administration",
      active: true,
      createdAt: Date.now(),
    });

    // Create doctor users and doctor records
    const doctors = [
      { username: "dr.smith", password: doctorPassword, name: "Dr. James Smith", specialization: "General Medicine", dept: "General Medicine", license: "MD-001" },
      { username: "dr.jones", password: doctorPassword, name: "Dr. Sarah Jones", specialization: "Pediatrics", dept: "Pediatrics", license: "MD-002" },
      { username: "dr.patel", password: doctorPassword, name: "Dr. Raj Patel", specialization: "Cardiology", dept: "Cardiology", license: "MD-003" },
      { username: "dr.chen", password: doctorPassword, name: "Dr. Emily Chen", specialization: "Orthopedics", dept: "Orthopedics", license: "MD-004" },
      { username: "dr.wilson", password: doctorPassword, name: "Dr. Michael Wilson", specialization: "Surgery", dept: "Surgery", license: "MD-005" },
    ];

    for (const doc of doctors) {
      const userId = await ctx.db.insert("users", {
        username: doc.username,
        passwordHash: doc.password,
        name: doc.name,
        role: "doctor",
        department: doc.dept,
        active: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("doctors", {
        userId: String(userId),
        name: doc.name,
        specialization: doc.specialization,
        licenseNumber: doc.license,
        department: doc.dept,
        available: true,
        consultationFee: 100,
      });
    }

    // Create nurse
    await ctx.db.insert("users", {
      username: "nurse.mary",
      passwordHash: nursePassword,
      name: "Mary Johnson",
      role: "nurse",
      department: "General Medicine",
      active: true,
      createdAt: Date.now(),
    });

    // Create pharmacist
    await ctx.db.insert("users", {
      username: "pharm.alex",
      passwordHash: pharmacistPassword,
      name: "Alex Thompson",
      role: "pharmacist",
      department: "Pharmacy",
      active: true,
      createdAt: Date.now(),
    });

    // Create receptionist
    await ctx.db.insert("users", {
      username: "recep.lisa",
      passwordHash: receptionPassword,
      name: "Lisa Brown",
      role: "receptionist",
      active: true,
      createdAt: Date.now(),
    });

    // Create sample patients
    const patients = [
      { pid: "P001", first: "John", last: "Doe", dob: "1985-03-15", gender: "male" as const, phone: "555-0101", address: "123 Main St", blood: "A+", status: "active" as const },
      { pid: "P002", first: "Jane", last: "Smith", dob: "1990-07-22", gender: "female" as const, phone: "555-0102", address: "456 Oak Ave", blood: "O+", status: "active" as const },
      { pid: "P003", first: "Robert", last: "Brown", dob: "1978-11-08", gender: "male" as const, phone: "555-0103", address: "789 Pine Rd", blood: "B+", status: "active" as const },
      { pid: "P004", first: "Maria", last: "Garcia", dob: "1995-01-30", gender: "female" as const, phone: "555-0104", address: "321 Elm St", blood: "AB-", status: "critical" as const },
      { pid: "P005", first: "David", last: "Wilson", dob: "1982-06-12", gender: "male" as const, phone: "555-0105", address: "654 Maple Dr", blood: "O-", status: "active" as const },
    ];

    const patientIds: string[] = [];
    for (const p of patients) {
      await ctx.db.insert("patients", {
        patientId: p.pid,
        firstName: p.first,
        lastName: p.last,
        dateOfBirth: p.dob,
        gender: p.gender,
        phone: p.phone,
        address: p.address,
        bloodGroup: p.blood,
        registrationDate: Date.now(),
        status: p.status,
        allergies: [],
      });
      patientIds.push(p.pid);
    }

    // Create sample medications
    const meds = [
      { name: "Amoxicillin", category: "Antibiotic", form: "Capsule", strength: "500mg", stock: 500, price: 5.99, reorder: 100, expiry: "2026-12-31" },
      { name: "Paracetamol", category: "Analgesic", form: "Tablet", strength: "500mg", stock: 1000, price: 2.99, reorder: 200, expiry: "2027-06-30" },
      { name: "Ibuprofen", category: "Anti-inflammatory", form: "Tablet", strength: "400mg", stock: 800, price: 4.49, reorder: 150, expiry: "2026-09-30" },
      { name: "Metformin", category: "Antidiabetic", form: "Tablet", strength: "500mg", stock: 300, price: 8.99, reorder: 80, expiry: "2026-11-30" },
      { name: "Lisinopril", category: "ACE Inhibitor", form: "Tablet", strength: "10mg", stock: 200, price: 12.49, reorder: 50, expiry: "2027-03-31" },
      { name: "Cetirizine", category: "Antihistamine", form: "Tablet", strength: "10mg", stock: 600, price: 3.99, reorder: 100, expiry: "2027-01-31" },
      { name: "Omeprazole", category: "Proton Pump Inhibitor", form: "Capsule", strength: "20mg", stock: 400, price: 7.49, reorder: 80, expiry: "2026-08-31" },
      { name: "Salbutamol", category: "Bronchodilator", form: "Inhaler", strength: "100mcg", stock: 50, price: 15.99, reorder: 20, expiry: "2026-05-31" },
    ];

    for (const m of meds) {
      await ctx.db.insert("medications", {
        name: m.name,
        category: m.category,
        dosageForm: m.form,
        strength: m.strength,
        stockQuantity: m.stock,
        unitPrice: m.price,
        reorderLevel: m.reorder,
        expiryDate: m.expiry,
        active: true,
      });
    }

    // Create sample devices
    const devices = [
      { name: "Patient Monitor Alpha", type: "Patient Monitor", serial: "PM-2024-001", dept: "Emergency", status: "active" as const },
      { name: "X-Ray Machine", type: "Imaging", serial: "XR-2024-001", dept: "Radiology", status: "active" as const },
      { name: "Ventilator Unit 3", type: "Ventilator", serial: "VT-2024-003", dept: "Emergency", status: "active" as const },
      { name: "ECG Machine", type: "Diagnostic", serial: "ECG-2024-001", dept: "Cardiology", status: "maintenance" as const },
      { name: "Infusion Pump", type: "Infusion", serial: "IP-2024-002", dept: "General Medicine", status: "active" as const },
    ];

    for (const d of devices) {
      await ctx.db.insert("devices", {
        deviceName: d.name,
        deviceType: d.type,
        serialNumber: d.serial,
        department: d.dept,
        status: d.status,
        createdAt: Date.now(),
        purchaseDate: "2024-01-15",
      });
    }

    return "Database seeded successfully with sample data";
  },
});

// Reset database (for development)
export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "auditLog", "billing", "labResults", "prescriptions",
      "medicalRecords", "appointments", "medications", "devices",
      "patients", "doctors", "ipAllowlist", "departments", "users",
    ];
    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return "Database reset complete";
  },
});
