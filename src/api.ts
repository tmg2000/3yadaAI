import type { ChatMessage, Doctor, AIResponse, Appointment, User, Conversation, Session, MedicalSummary } from "./types";
import { apiUrl } from "./config";
import { createTokenStore } from "./token-store";

const tokenStore = createTokenStore("token");

export function setToken(t: string | null) {
  tokenStore.set(t);
}

export function getToken(): string | null {
  return tokenStore.get();
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const t = tokenStore.get();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...rest } = options ?? {};
  const res = await fetch(apiUrl(url), {
    ...rest,
    headers: { "Content-Type": "application/json", ...headers(), ...(extraHeaders as Record<string, string>) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "حدث خطأ في الاتصال بالخادم");
  return data as T;
}

export async function register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<{ user: User }> {
  return request("/api/auth/me");
}

export async function updateProfile(data: {
  name?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  age?: number | null;
  health_insurance?: string | null;
}): Promise<{ user: User }> {
  return request("/api/auth/me", {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function checkHealth(): Promise<{
  ok: boolean;
  ollamaConfigured: boolean;
  model: string;
}> {
  return request("/api/health");
}

export async function startChat(sessionId?: string): Promise<AIResponse> {
  return request("/api/chat/start", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ sessionId }),
  });
}

export async function createSession(): Promise<{ sessionId: string }> {
  return request("/api/sessions", { method: "POST", headers: headers() });
}

export async function fetchSessions(): Promise<Session[]> {
  return request("/api/sessions", { headers: headers() });
}

export async function fetchSession(id: string): Promise<Session> {
  return request(`/api/sessions/${id}`, { headers: headers() });
}

export async function updateSession(id: string, data: { summary?: MedicalSummary; status?: string }): Promise<{ success: boolean }> {
  return request(`/api/sessions/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function sendChatMessage(
  conversationId: string,
  history: ChatMessage[],
  message: string
): Promise<AIResponse> {
  return request(`/api/chat/${conversationId}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      history: history.map(({ role, content }) => ({ role, content })),
      message,
    }),
  });
}

export async function sendChatMessageWithFiles(
  conversationId: string,
  history: ChatMessage[],
  message: string,
  files: File[]
): Promise<AIResponse> {
  const form = new FormData();
  form.append("history", JSON.stringify(history.map(({ role, content }) => ({ role, content }))));
  form.append("message", message);
  for (const f of files) form.append("files", f);

  const res = await fetch(apiUrl(`/api/chat/${conversationId}/upload`), {
    method: "POST",
    headers: headers(),
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "حدث خطأ في الاتصال بالخادم");
  return data as AIResponse;
}

export async function fetchConversations(): Promise<Conversation[]> {
  return request("/api/conversations");
}

export async function fetchConversation(id: string): Promise<Conversation & { messages: { id: string; role: string; content: string; attachments?: string }[] }> {
  return request(`/api/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  return request(`/api/conversations/${id}`, { method: "DELETE", headers: headers() });
}

export async function updateConversationTitle(id: string, title: string): Promise<{ success: boolean }> {
  return request(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ title }),
  });
}

export async function fetchDoctors(specialties: string[], city?: string | null, insurance?: string | null): Promise<Doctor[]> {
  const params = new URLSearchParams();
  if (specialties.length) params.set("specialties", specialties.join(","));
  if (city) params.set("city", city);
  if (insurance) params.set("insurance", insurance);
  return request(`/api/doctors?${params}`);
}

export async function bookAppointment(payload: {
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  city: string;
  slot: string;
  patientName: string;
  phone: string;
  fee: number;
  sessionId?: string;
}): Promise<{ success: boolean; appointment: Appointment }> {
  return request("/api/appointments", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return request("/api/appointments");
}

export async function requestAppointmentModification(id: string, data: { slot?: string; patientName?: string; phone?: string }): Promise<{ success: boolean }> {
  return request(`/api/appointments/${id}/request-modify`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
