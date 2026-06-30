import type { DoctorAppointment, DoctorStats, DoctorReport, DoctorSubscription, SubscriptionPlan, DoctorSummary } from "./types";
import { apiUrl } from "./config";
import { createTokenStore } from "./token-store";

const doctorTokenStore = createTokenStore("doctor_token");

export function setDoctorToken(t: string | null) {
  doctorTokenStore.set(t);
}

export function getDoctorToken(): string | null {
  return doctorTokenStore.get();
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra, "Content-Type": "application/json" };
  const t = doctorTokenStore.get();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...rest } = options ?? {};
  const isFormData = rest.body instanceof FormData;
  const reqHeaders: Record<string, string> = { ...((extraHeaders ?? {}) as Record<string, string>) };
  if (!isFormData) {
    reqHeaders["Content-Type"] = "application/json";
  }
  const res = await fetch(apiUrl(url), {
    ...rest,
    headers: reqHeaders,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "خطأ في الاتصال");
  return data as T;
}

export async function doctorLogin(email: string, password: string): Promise<{ doctor: any; token: string }> {
  return request("/api/doctors/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchDoctorMe(): Promise<{ doctor: any }> {
  return request("/api/doctors/me", { headers: headers() });
}

export async function doctorRegister(
  name: string, email: string, password: string,
  specialty: string, specialtyKey: string, hospital: string,
  city?: string, area?: string, licenseNumber?: string, phone?: string, bio?: string,
  idCard?: File, licenseDoc?: File
): Promise<{ doctor: any; token: string }> {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("email", email);
  fd.append("password", password);
  fd.append("specialty", specialty);
  fd.append("specialtyKey", specialtyKey);
  fd.append("hospital", hospital);
  if (city) fd.append("city", city);
  if (area) fd.append("area", area);
  if (licenseNumber) fd.append("licenseNumber", licenseNumber);
  if (phone) fd.append("phone", phone);
  if (bio) fd.append("bio", bio);
  if (idCard) fd.append("idCard", idCard);
  if (licenseDoc) fd.append("licenseDoc", licenseDoc);

  return request("/api/doctors/register", {
    method: "POST",
    body: fd,
  });
}

export async function updateDoctorProfile(data: { name?: string; phone?: string; bio?: string; city?: string; area?: string; licenseNumber?: string; acceptedInsurances?: string[] }, idCard?: File, licenseDoc?: File): Promise<{ doctor: any }> {
  if (idCard || licenseDoc) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined) fd.append(k, JSON.stringify(v)); });
    if (idCard) fd.append("idCard", idCard);
    if (licenseDoc) fd.append("licenseDoc", licenseDoc);
    return request("/api/doctors/me", { method: "PUT", body: fd });
  }
  return request("/api/doctors/me", {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function fetchDoctorAppointments(filters?: { status?: string; from?: string; to?: string }): Promise<DoctorAppointment[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/doctors/appointments${q}`, { headers: headers() });
}

export async function updateAppointmentStatus(id: string, status: string): Promise<{ success: boolean }> {
  return request(`/api/doctors/appointments/${id}/status`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ status }),
  });
}

export async function fetchDoctorStats(from?: string, to?: string): Promise<DoctorStats> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/doctors/stats${q}`, { headers: headers() });
}

export async function fetchDoctorReport(period: "3m" | "6m" | "1y"): Promise<DoctorReport> {
  return request(`/api/doctors/report?period=${period}`, { headers: headers() });
}

export async function fetchDoctorSummaries(filters?: { from?: string; to?: string }): Promise<DoctorSummary[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/doctors/summaries${q}`, { headers: headers() });
}

export async function updateDoctorSummary(id: string, content: string): Promise<DoctorSummary> {
  return request(`/api/doctors/summaries/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ content }),
  });
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return request("/api/doctors/subscription/plans");
}

export async function fetchMySubscription(): Promise<DoctorSubscription | null> {
  return request("/api/doctors/subscription/my", { headers: headers() });
}

export async function subscribeToPlan(planId: string, yearly?: boolean): Promise<{ success: boolean; subscriptionId: string; plan: string }> {
  return request("/api/doctors/subscription/subscribe", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ planId, yearly }),
  });
}

// --- Clinic Patients ---
export async function fetchDoctorPatients(filters?: { search?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/doctors/patients${q}`, { headers: headers() });
}

export async function createDoctorPatient(data: { name: string; phone?: string; age?: number; gender?: string; history?: string; notes?: string }): Promise<any> {
  return request("/api/doctors/patients", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function updateDoctorPatient(id: string, data: { name?: string; phone?: string; age?: number; gender?: string; history?: string; notes?: string }): Promise<any> {
  return request(`/api/doctors/patients/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function fetchDoctorPatientDetail(id: string): Promise<{ patient: any; prescriptions: any[]; appointments: any[]; visits: any[]; files: any[]; financials: any[] }> {
  return request(`/api/doctors/patients/${id}`, { headers: headers() });
}

export async function createPatientVisit(patientId: string, data: { visitDate?: string; chiefComplaint?: string; diagnosis?: string; treatmentPlan?: string; notes?: string; followUpDate?: string }): Promise<any> {
  return request(`/api/doctors/patients/${patientId}/visits`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function uploadPatientFile(patientId: string, data: { fileType: string; title: string; notes?: string; file?: File | null }): Promise<any> {
  const fd = new FormData();
  fd.append("fileType", data.fileType);
  fd.append("title", data.title);
  if (data.notes) fd.append("notes", data.notes);
  if (data.file) fd.append("file", data.file);
  return request(`/api/doctors/patients/${patientId}/files`, {
    method: "POST",
    body: fd,
  });
}

// --- Clinic Finances ---
export async function fetchClinicFinances(filters?: { type?: string; from?: string; to?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.toString() ? `?${params}` : "";
  return request(`/api/doctors/finances${q}`, { headers: headers() });
}

export async function createClinicFinance(data: {
  patientId?: string;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  paymentMethod?: string;
  counterparty?: string;
  status?: "paid" | "unpaid" | "partial";
  transactionDate?: string;
  dueDate?: string;
  notes?: string;
}): Promise<any> {
  return request("/api/doctors/finances", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

// --- Prescriptions ---
export async function fetchDoctorPrescriptions(patientId?: string): Promise<any[]> {
  const q = patientId ? `?patientId=${patientId}` : "";
  return request(`/api/doctors/prescriptions${q}`, { headers: headers() });
}

export async function createPrescription(data: { patientId?: string; patientName: string; patientPhone?: string; medicationName: string; dosage?: string; frequency?: string; duration?: string; notes?: string }): Promise<any> {
  return request("/api/doctors/prescriptions", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function updatePrescription(id: string, data: { medicationName?: string; dosage?: string; frequency?: string; duration?: string; notes?: string }): Promise<any> {
  return request(`/api/doctors/prescriptions/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function deletePrescription(id: string): Promise<{ success: boolean }> {
  return request(`/api/doctors/prescriptions/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
}
