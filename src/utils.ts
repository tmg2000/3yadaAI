import type { UrgencyLevel } from "./types";
import ar from "./i18n/ar";

const specialtyLabels: Record<string, string> = {
  general: ar["specialty.general"],
  internal: ar["specialty.internal"],
  pediatrics: ar["specialty.pediatrics"],
  cardiology: ar["specialty.cardiology"],
  dermatology: ar["specialty.dermatology"],
  orthopedics: ar["specialty.orthopedics"],
  gynecology: ar["specialty.gynecology"],
  ent: ar["specialty.ent"],
  psychiatry: ar["specialty.psychiatry"],
  ophthalmology: ar["specialty.ophthalmology"],
  dentistry: ar["specialty.dentistry"],
};

export function getSpecialtyLabel(key: string): string {
  return specialtyLabels[key] ?? key;
}

export function formatSlot(iso: string): string {
  const d = new Date(iso);
  const lang = document.documentElement.lang === "en" ? "en-US" : "ar-SA";
  return d.toLocaleString(lang, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function urgencyMeta(level: UrgencyLevel): {
  label: string;
  className: string;
} {
  const map: Record<UrgencyLevel, { label: string; className: string }> = {
    low: { label: ar["urgency.low"], className: "badge-low" },
    medium: { label: ar["urgency.medium"], className: "badge-medium" },
    high: { label: ar["urgency.high"], className: "badge-high" },
    emergency: { label: ar["urgency.emergency"], className: "badge-emergency" },
  };
  return map[level] ?? map.medium;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


export function getCurrency(_city?: string): string {
  const isEn = document.documentElement.lang === "en";
  return isEn ? "EGP" : "جنيه";
}

const statusLabels: Record<string, string> = {
  pending: ar["status.pending"],
  confirmed: ar["status.confirmed"],
  approved: ar["status.approved"],
  rejected: ar["status.rejected"],
  completed: ar["status.completed"],
  modification_requested: ar["status.modification_requested"],
};

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status;
}
