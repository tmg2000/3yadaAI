import { useCallback, useEffect, useState } from "react";
import { useI18n } from "./i18n";
import {
  checkHealth,
  startChat,
  sendChatMessage,
  sendChatMessageWithFiles,
  fetchDoctors,
  bookAppointment,
  fetchConversation,
  login as apiLogin,
  register as apiRegister,
  setToken,
  getToken,
  fetchMe,
  createSession,
  updateSession,
} from "./api";
import type {
  AppStep,
  ChatMessage,
  Doctor,
  MedicalSummary,
  Appointment,
  Attachment,
  AIResponse,
  User,
} from "./types";
import { generateId } from "./utils";
import { Header } from "./components/Header";
import { StepIndicator } from "./components/StepIndicator";
import { LoginPage } from "./components/LoginPage";
import { HomePage } from "./components/HomePage";
import { ChatScreen } from "./components/ChatScreen";
import { SummaryScreen } from "./components/SummaryScreen";
import { DoctorsScreen } from "./components/DoctorsScreen";
import { BookingScreen } from "./components/BookingScreen";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { HistoryPage } from "./components/HistoryPage";
import { CalendarPage } from "./components/CalendarPage";
import { ProfilePage } from "./components/ProfilePage";
import { DoctorLoginPage } from "./components/DoctorLoginPage";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { AdminLoginPage } from "./components/AdminLoginPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { getDoctorToken, setDoctorToken, fetchDoctorMe as apiDoctorMe } from "./api-doctor";
import { getAdminToken, setAdminToken, fetchAdminMe as apiAdminMe } from "./api-admin";
import { uploadUrl } from "./config";
export default function App() {
  const { t } = useI18n();
  const initialPortal = window.location.hash.replace("#", "");
  const [step, setStep] = useState<AppStep>(
    initialPortal === "doctor" ? "doctor-login" : initialPortal === "admin" ? "admin-login" : "login"
  );
  const [aiReady, setAiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const refreshHealth = useCallback(() => {
    checkHealth()
      .then((h) => setAiReady(h.ollamaConfigured))
      .catch(() => setAiReady(false));
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  useEffect(() => {
    if (initialPortal === "doctor" || initialPortal === "admin") {
      setCheckingAuth(false);
      return;
    }
    const token = getToken();
    if (token) {
      fetchMe()
        .then(({ user }) => { setUser(user); setStep("home"); setCheckingAuth(false); })
        .catch(() => { setToken(null); setCheckingAuth(false); });
    } else {
      setCheckingAuth(false);
    }
  }, [initialPortal]);

  useEffect(() => {
    if (initialPortal !== "doctor") return;
    const dToken = getDoctorToken();
    if (dToken) {
      apiDoctorMe()
        .then(({ doctor }) => { setDoctor(doctor); setStep("doctor-dashboard"); setCheckingAuth(false); })
        .catch(() => { setDoctorToken(null); setCheckingAuth(false); });
    } else {
      setCheckingAuth(false);
    }
  }, [initialPortal]);

  useEffect(() => {
    if (initialPortal !== "admin") return;
    const aToken = getAdminToken();
    if (aToken) {
      apiAdminMe()
        .then(({ admin }) => { setAdmin(admin); setStep("admin-dashboard"); setCheckingAuth(false); })
        .catch(() => { setAdminToken(null); setCheckingAuth(false); });
    } else {
      setCheckingAuth(false);
    }
  }, [initialPortal]);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content }]);
  }, []);

  const processAIResponse = useCallback(
    (response: AIResponse) => {
      addAssistantMessage(response.message);
      if (response.phase === "ready_for_summary" && response.summary) {
        setSummary(response.summary);
        if (sessionId) updateSession(sessionId, { summary: response.summary }).catch(() => {});
        setTimeout(() => setStep("summary"), 600);
      }
    },
    [addAssistantMessage, sessionId]
  );

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setSummary(null);
    setDoctors([]);
    setSelectedDoctor(null);
    setAppointment(null);
    setConversationId(null);

    try {
      const sess = await createSession();
      setSessionId(sess.sessionId);
      const response = await startChat(sess.sessionId);
      setConversationId(response.conversationId ?? null);
      setMessages([{ id: generateId(), role: "assistant", content: response.message }]);
      setStep(response.phase === "ready_for_summary" && response.summary ? "summary" : "chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (!conversationId) return;
    const attachments: Attachment[] | undefined = files?.length
      ? files.map((f) => ({
          id: generateId(),
          name: f.name,
          type: f.type.startsWith("image/") ? "image" : "pdf",
          url: URL.createObjectURL(f),
          size: f.size,
        }))
      : undefined;

    const userMsg: ChatMessage = { id: generateId(), role: "user", content: text, attachments };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    setError(null);

    try {
      const response: AIResponse = files?.length
        ? await sendChatMessageWithFiles(conversationId, messages, text, files)
        : await sendChatMessage(conversationId, messages, text);
      processAIResponse(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishEarly = async () => {
    await handleSendMessage("لدي معلومات كافية عن أعراضي. الرجاء إعداد الملخص الطبي للطبيب الآن.");
  };

  const handleContinueToDoctors = async () => {
    if (!summary) return;
    setStep("doctors");
    setLoading(true);
    setError(null);
    try {
      const specialties = summary.recommendedSpecialties ?? [];
      const insurance = summary.preferredInsurance ?? user?.health_insurance ?? undefined;
      const list = await fetchDoctors(specialties, summary.preferredCity, insurance);
      const allowed = new Set(specialties.map((k) => k.trim().toLowerCase()));
      const matched =
        allowed.size > 0
          ? list.filter((d) => allowed.has(d.specialtyKey.toLowerCase()))
          : list;
      setDoctors(matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToChatFromDoctors = () => {
    setStep("chat");
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep("booking");
  };

  const handleBook = async (data: { patientName: string; phone: string; slot: string }) => {
    if (!selectedDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const result = await bookAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        hospital: selectedDoctor.hospital,
        city: selectedDoctor.city,
        slot: data.slot,
        patientName: data.patientName,
        phone: data.phone,
        fee: selectedDoctor.consultationFee,
        sessionId: sessionId ?? undefined,
      });
      setAppointment(result.appointment);
      setStep("confirmation");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setSessionId(null);
    setConversationId(null);
    setMessages([]);
    setSummary(null);
    setDoctors([]);
    setSelectedDoctor(null);
    setAppointment(null);
    setError(null);
    setStep("home");
  };

  const handleSelectConversation = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const conv = await fetchConversation(id);
      setConversationId(conv.id);
      const loaded: ChatMessage[] = [];
      for (const m of conv.messages) {
        let att: Attachment[] | undefined;
        if (m.attachments) {
          const parsed = JSON.parse(m.attachments) as Array<{ name: string; path: string }>;
          att = parsed.map((a, i) => ({
            id: `${m.id}-${i}`,
            name: a.name,
            type: (a.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image" : "pdf") as "image" | "pdf",
            url: uploadUrl(a.path),
            size: 0,
          }));
        }
        loaded.push({ id: m.id, role: m.role as "user" | "assistant", content: m.content, attachments: att });
      }
      setMessages(loaded);
      setStep("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const { user, token } = await apiLogin(email, password);
    setToken(token);
    setUser(user);
    setStep("home");
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const { user, token } = await apiRegister(name, email, password);
    setToken(token);
    setUser(user);
    setStep("home");
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSessionId(null);
    setConversationId(null);
    setMessages([]);
    setSummary(null);
    setStep("login");
  };

  const handleDoctorLogout = () => {
    setDoctorToken(null);
    setDoctor(null);
    setStep("login");
  };

  const handleAdminLogin = (admin: any, token: string) => {
    setAdminToken(token);
    setAdmin(admin);
    setStep("admin-dashboard");
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setAdmin(null);
    setStep("login");
  };

  const renderStepIndicator = step !== "login" && step !== "home" && step !== "history" && step !== "calendar" && step !== "profile" && step !== "doctor-login" && step !== "doctor-dashboard" && step !== "admin-login" && step !== "admin-dashboard";

  return (
    <div className="mobile-app-shell flex min-h-screen flex-col">
      {step !== "login" && step !== "doctor-login" && step !== "doctor-dashboard" && step !== "admin-login" && step !== "admin-dashboard" && (
        <Header
          aiReady={aiReady}
          userName={user?.name}
          onLogout={handleLogout}
          onHome={() => setStep("home")}
        />
      )}

      <main className={`mx-auto w-full flex-1 px-4 py-6 pb-12 ${step === "doctor-dashboard" || step === "admin-dashboard" ? "max-w-5xl" : "max-w-3xl"}`}>
        {renderStepIndicator && <StepIndicator current={step} />}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
            <button type="button" className="mr-2 underline" onClick={() => setError(null)}>إغلاق</button>
          </div>
        )}

        {checkingAuth && (
          <div className="flex flex-col items-center justify-center py-32">
            <span className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-muted text-sm">جاري التحقق من الجلسة...</p>
          </div>
        )}

        {!checkingAuth && step === "login" && (
          <>
            <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
            <div className="mt-6 border-t border-slate-200 pt-6 flex flex-col items-center gap-3">
              <button onClick={() => setStep("doctor-login")} className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-200 bg-primary-50 px-6 py-3 text-sm font-semibold text-primary-700 transition hover:border-primary-400 hover:bg-primary-100 w-full max-w-xs justify-center">
                <span className="text-xl">🩺</span>
                دخول الأطباء
              </button>
              <button onClick={() => setStep("admin-login")} className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-2.5 text-xs font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 w-full max-w-xs justify-center">
                <span className="text-base">🔐</span>
                دخول المشرف
              </button>
            </div>
          </>
        )}

        {step === "doctor-login" && (
          <DoctorLoginPage onLogin={(d) => { setDoctor(d); setStep("doctor-dashboard"); }} onBack={() => setStep("login")} />
        )}

        {step === "doctor-dashboard" && doctor && (
          <DoctorDashboard doctor={doctor} onLogout={handleDoctorLogout} />
        )}

        {step === "admin-login" && (
          <AdminLoginPage onLogin={handleAdminLogin} onBack={() => setStep("login")} />
        )}

        {step === "admin-dashboard" && admin && (
          <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
        )}

        {step === "home" && user && (
          <HomePage
            userName={user.name}
            onStartConsultation={handleStart}
            onViewHistory={() => setStep("history")}
            onViewCalendar={() => setStep("calendar")}
            onViewProfile={() => setStep("profile")}
            loading={loading}
            aiReady={aiReady}
          />
        )}

        {step === "history" && (
          <HistoryPage onSelectConversation={handleSelectConversation} onBack={() => setStep("home")} />
        )}

        {step === "calendar" && <CalendarPage onBack={() => setStep("home")} />}

        {step === "profile" && user && (
          <ProfilePage user={user} onLogout={handleLogout} onBack={() => setStep("home")} onUserUpdate={setUser} />
        )}

        {step === "chat" && (
          <ChatScreen
            messages={messages}
            loading={loading}
            onSend={handleSendMessage}
            onFinishEarly={handleFinishEarly}
          />
        )}

        {step === "summary" && summary && (
          <SummaryScreen summary={summary} onContinue={handleContinueToDoctors} />
        )}

        {step === "doctors" && (
          <DoctorsScreen
            doctors={doctors}
            loading={loading}
            selectedId={selectedDoctor?.id ?? null}
            onSelect={handleSelectDoctor}
            onBack={() => setStep("summary")}
            onBackToChat={handleBackToChatFromDoctors}
          />
        )}

        {step === "booking" && selectedDoctor && (
          <BookingScreen
            doctor={selectedDoctor}
            loading={loading}
            onSubmit={handleBook}
            onBack={() => setStep("doctors")}
          />
        )}

        {step === "confirmation" && appointment && (
          <ConfirmationScreen appointment={appointment} onRestart={handleRestart} />
        )}


      </main>

      <footer className="border-t border-slate-100 bg-white/60 py-5 text-center text-xs text-slate-500">
        عيادة AI © {new Date().getFullYear()} — لا يغني عن الاستشارة الطبية المباشرة
      </footer>
    </div>
  );
}
