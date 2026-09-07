import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generatePatientId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `P${num}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "text-emerald-600",
    critical: "text-red-600",
    discharged: "text-purple-600",
    paid: "text-emerald-600",
    pending: "text-amber-600",
    partial: "text-blue-600",
    cancelled: "text-red-600",
    completed: "text-emerald-600",
    scheduled: "text-amber-600",
    confirmed: "text-blue-600",
    "in-progress": "text-blue-600",
    "no-show": "text-red-600",
    maintenance: "text-blue-600",
    inactive: "text-gray-600",
    retired: "text-gray-600",
    dispensed: "text-gray-600",
    reviewed: "text-emerald-600",
    "lab Technician": "text-indigo-600",
  };
  return colors[status] || "text-gray-600";
}

export const roleLabels: Record<string, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  receptionist: "Receptionist",
  "lab Technician": "Lab Technician",
};

export const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  doctor: "bg-blue-100 text-blue-700",
  nurse: "bg-green-100 text-green-700",
  pharmacist: "bg-purple-100 text-purple-700",
  receptionist: "bg-amber-100 text-amber-700",
  "lab Technician": "bg-indigo-100 text-indigo-700",
};
