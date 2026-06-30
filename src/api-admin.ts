import { apiUrl } from "./config";
import type { AdminReport } from "./types";
import { createTokenStore } from "./token-store";

const adminTokenStore = createTokenStore("adminToken");

export function setAdminToken(t: string | null) {
  adminTokenStore.set(t);
}

export function getAdminToken(): string | null {
  return adminTokenStore.get();
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const t = adminTokenStore.get();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(url), {
    ...options,
    headers: { "Content-Type": "application/json", ...headers(), ...((options?.headers as Record<string, string>) || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "خطأ في الاتصال بالخادم");
  return data as T;
}

export function adminLogin(email: string, password: string): Promise<{ admin: { id: string; name: string; email: string; role: string }; token: string }> {
  return request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchAdminMe(): Promise<{ admin: { id: string; name: string; email: string; role: string } }> {
  return request("/api/admin/me", { headers: headers() });
}

export type AdminDashboardStats = {
  totalUsers: number; totalDoctors: number; totalAppointments: number;
  totalConversations: number; pendingAppointments: number;
  totalDoctorRevenue: number; totalPlatformRevenue: number;
  verifiedDoctors: number; activeSubscriptions: number; totalAdmins: number;
  lastMonth: { users: number; doctors: number; appointments: number; revenue: number };
};

export function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  return request("/api/admin/dashboard", { headers: headers() });
}

export function fetchAdminReport(period: "3m" | "6m" | "1y"): Promise<AdminReport> {
  return request(`/api/admin/report?period=${period}`, { headers: headers() });
}

// --- Conversations ---
export function fetchAdminConversations(page = 1, limit = 20, filters?: { from?: string; to?: string }): Promise<{ conversations: any[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  return request(`/api/admin/conversations?${params}`, { headers: headers() });
}

// Grouped conversations by user
export function fetchAdminGroupedConversations(): Promise<any[]> {
  return request("/api/admin/conversations/grouped", { headers: headers() });
}

export function fetchAdminConversation(id: string): Promise<any> {
  return request(`/api/admin/conversations/${id}`, { headers: headers() });
}

// --- Doctors ---
export function fetchAdminDoctors(filters?: { search?: string; verified?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.verified) params.set("verified", filters.verified);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/admin/doctors${q}`, { headers: headers() });
}

export function fetchAdminDoctorDetail(id: string): Promise<any> {
  return request(`/api/admin/doctors/${id}`, { headers: headers() });
}

export function updateAdminDoctor(id: string, data: any): Promise<{ success: boolean }> {
  return request(`/api/admin/doctors/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export function deleteAdminDoctor(id: string): Promise<{ success: boolean }> {
  return request(`/api/admin/doctors/${id}`, { method: "DELETE", headers: headers() });
}

export async function exportAdminDoctors(): Promise<void> {
  const res = await fetch(apiUrl("/api/admin/doctors/export"), {
    headers: { ...headers() },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "فشل تصدير الأطباء");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `doctors-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAdminDoctors(csv: string): Promise<{ success: boolean; imported: number }> {
  return request("/api/admin/doctors/import", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ csv }),
  });
}

export function assignDoctorSubscription(id: string, planId: string, endDate?: string): Promise<any> {
  return request(`/api/admin/doctors/${id}/subscription`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ planId, endDate }),
  });
}

// --- Patients ---
export function fetchAdminPatients(filters?: { search?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/admin/patients${q}`, { headers: headers() });
}

export function fetchAdminPatientDetail(id: string): Promise<any> {
  return request(`/api/admin/patients/${id}`, { headers: headers() });
}

// --- Appointments ---
export function fetchAdminAppointments(filters?: { status?: string; search?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/admin/appointments${q}`, { headers: headers() });
}

export function updateAdminAppointment(id: string, data: any): Promise<{ success: boolean }> {
  return request(`/api/admin/appointments/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

// --- Subscriptions ---
export function fetchAdminSubscriptions(filters?: { active?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.active !== undefined) params.set("active", filters.active);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/admin/subscriptions${q}`, { headers: headers() });
}

export function fetchAdminSubscriptionPlans(): Promise<any[]> {
  return request("/api/admin/subscription-plans", { headers: headers() });
}

// --- Admins ---
export function fetchAdminAdmins(): Promise<any[]> {
  return request("/api/admin/admins", { headers: headers() });
}

export function createAdminAdmin(name: string, email: string, password: string): Promise<any> {
  return request("/api/admin/admins", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name, email, password }),
  });
}

export function deleteAdminAdmin(id: string): Promise<any> {
  return request(`/api/admin/admins/${id}`, { method: "DELETE", headers: headers() });
}

// --- Password changes ---
export function changeAdminPassword(id: string, password: string): Promise<any> {
  return request(`/api/admin/admins/${id}/password`, {
    method: "PUT", headers: headers(), body: JSON.stringify({ password }),
  });
}

export function changeDoctorPassword(id: string, password: string): Promise<any> {
  return request(`/api/admin/doctors/${id}/password`, {
    method: "PUT", headers: headers(), body: JSON.stringify({ password }),
  });
}

export function changePatientPassword(id: string, password: string): Promise<any> {
  return request(`/api/admin/patients/${id}/password`, {
    method: "PUT", headers: headers(), body: JSON.stringify({ password }),
  });
}
