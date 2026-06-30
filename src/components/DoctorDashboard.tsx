import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { getCurrency } from "../utils";
import logo from "../logo.png";
import {
  fetchDoctorAppointments,
  updateAppointmentStatus,
  fetchDoctorSummaries,
  updateDoctorSummary,
  fetchDoctorStats,
  fetchDoctorReport,
  fetchSubscriptionPlans,
  fetchMySubscription,
  subscribeToPlan,
  updateDoctorProfile,
  fetchDoctorPatients,
  createDoctorPatient,
  fetchDoctorPatientDetail,
  createPatientVisit,
  uploadPatientFile,
  fetchClinicFinances,
  createClinicFinance,
  createPrescription,
  deletePrescription,
} from "../api-doctor";
import type { DoctorAppointment, DoctorSummary, DoctorStats, DoctorReport, SubscriptionPlan, DoctorSubscription } from "../types";
import { uploadUrl } from "../config";

type Props = {
  doctor: any;
  onLogout: () => void;
};

type Tab = "dashboard" | "appointments" | "patients" | "finances" | "summaries" | "subscription" | "profile";

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-sky-50 text-sky-700 border-sky-200",
  modification_requested: "bg-purple-50 text-purple-700 border-purple-200",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "مقبول",
  rejected: "مرفوض",
  completed: "مكتمل",
  modification_requested: "طلب تعديل",
};

type FinancialTransaction = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  payment_method?: string | null;
  counterparty?: string | null;
  status: "paid" | "unpaid" | "partial";
  transaction_date: string;
  due_date?: string | null;
  notes?: string | null;
};

export function DoctorDashboard({ doctor, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [appts, setAppts] = useState<DoctorAppointment[]>([]);
  const [summaries, setSummaries] = useState<DoctorSummary[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mySub, setMySub] = useState<DoctorSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Server-side patients (fetched from API)

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // State for forms
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);

  // New Patient Form state
  const [newPName, setNewPName] = useState("");
  const [newPAge, setNewPAge] = useState("");
  const [newPGender, setNewPGender] = useState<"ذكر" | "أنثى">("ذكر");
  const [newPPhone, setNewPPhone] = useState("");
  const [newPHistory, setNewPHistory] = useState("");
  const [newPNotes, setNewPNotes] = useState("");

  // New Invoice Form state
  const [txPatientId, setTxPatientId] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txCategory, setTxCategory] = useState("كشف");
  const [txTitle, setTxTitle] = useState("كشف طبي");
  const [txAmount, setTxAmount] = useState("");
  const [txMethod, setTxMethod] = useState("نقدي");
  const [txCounterparty, setTxCounterparty] = useState("");
  const [txStatus, setTxStatus] = useState<"paid" | "unpaid" | "partial">("paid");
  const [txDueDate, setTxDueDate] = useState("");
  const [txNotes, setTxNotes] = useState("");

  // Profile Edit fields
  const [editName, setEditName] = useState(doctor.name ?? "");
  const [editPhone, setEditPhone] = useState(doctor.phone ?? "");
  const [editCity, setEditCity] = useState(doctor.city ?? "");
  const [editArea, setEditArea] = useState(doctor.area ?? "");
  const [editLicense, setEditLicense] = useState(doctor.licenseNumber ?? "");
  const [editBio, setEditBio] = useState(doctor.bio ?? "");
  const [editInsurances, setEditInsurances] = useState<string[]>(doctor.acceptedInsurances ?? []);
  const [newInsurance, setNewInsurance] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [licenseDocFile, setLicenseDocFile] = useState<File | null>(null);

  // Server-side patients
  const [serverPatients, setServerPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientDetail, setPatientDetail] = useState<{ prescriptions: any[]; appointments: any[]; visits: any[]; files: any[]; financials: any[] } | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);
  const [rxMedication, setRxMedication] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxFrequency, setRxFrequency] = useState("");
  const [rxDuration, setRxDuration] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [visitComplaint, setVisitComplaint] = useState("");
  const [visitDiagnosis, setVisitDiagnosis] = useState("");
  const [visitPlan, setVisitPlan] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitFollowUp, setVisitFollowUp] = useState("");
  const [fileType, setFileType] = useState("lab");
  const [fileTitle, setFileTitle] = useState("");
  const [fileNotes, setFileNotes] = useState("");
  const [patientFile, setPatientFile] = useState<File | null>(null);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Filter state
  const [apptStatus, setApptStatus] = useState("");
  const [apptFrom, setApptFrom] = useState("");
  const [apptTo, setApptTo] = useState("");
  const [patientFrom, setPatientFrom] = useState("");
  const [patientTo, setPatientTo] = useState("");
  const [financeType, setFinanceType] = useState("");
  const [financeFrom, setFinanceFrom] = useState("");
  const [financeTo, setFinanceTo] = useState("");
  const [summaryFrom, setSummaryFrom] = useState("");
  const [summaryTo, setSummaryTo] = useState("");

  useEffect(() => {
    const jobs: Promise<any>[] = [];
    if (tab === "dashboard" || tab === "appointments") {
      jobs.push(fetchDoctorAppointments({ status: apptStatus || undefined, from: apptFrom || undefined, to: apptTo || undefined }).then(setAppts));
    }
    if (tab === "dashboard" || tab === "summaries") {
      jobs.push(fetchDoctorSummaries({ from: summaryFrom || undefined, to: summaryTo || undefined }).then(setSummaries));
    }
    if (tab === "dashboard" || tab === "subscription") {
      jobs.push(Promise.all([fetchSubscriptionPlans(), fetchMySubscription()])
        .then(([p, s]) => { setPlans(p); setMySub(s); }));
    }
    if (tab === "dashboard" || tab === "patients") {
      jobs.push(fetchDoctorPatients({ search: searchQuery || undefined, from: patientFrom || undefined, to: patientTo || undefined }).then(setServerPatients));
    }
    if (tab === "dashboard" || tab === "finances") {
      jobs.push(fetchClinicFinances({ type: financeType || undefined, from: financeFrom || undefined, to: financeTo || undefined }).then(setTransactions));
    }
    if (tab === "dashboard") {
      jobs.push(fetchDoctorStats().then(setStats));
    }
    if (jobs.length > 0) {
      setLoading(true);
      Promise.all(jobs.map(p => p.catch(() => {}))).finally(() => setLoading(false));
    }
  }, [tab, doctor.id, apptStatus, apptFrom, apptTo, summaryFrom, summaryTo, searchQuery, patientFrom, patientTo, financeType, financeFrom, financeTo]);

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (status === "completed") {
        fetchClinicFinances().then(setTransactions).catch(() => {});
      }

      showToast(`تم ${status === "approved" ? "قبول" : status === "rejected" ? "رفض" : "إكمال"} الموعد بنجاح ✅`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل التحديث", "error");
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleEditSummary = (s: DoctorSummary) => {
    setEditingSummaryId(s.id);
    setEditingContent(formatSummaryContent(s.content));
  };

  const handleCancelEditSummary = () => {
    setEditingSummaryId(null);
    setEditingContent("");
  };

  const handleSaveSummary = async (id: string) => {
    if (!editingContent.trim()) { showToast("محتوى الملخص مطلوب", "error"); return; }
    try {
      const updated = await updateDoctorSummary(id, editingContent.trim());
      setSummaries(prev => prev.map(s => s.id === id ? updated : s));
      setEditingSummaryId(null);
      setEditingContent("");
      showToast("تم تحديث الملخص بنجاح", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل تحديث الملخص", "error");
    }
  };

  function formatSummaryContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      const lines: string[] = [];
      if (parsed.patientConcerns) lines.push(`🔹 شكوى المريض: ${parsed.patientConcerns}`);
      if (parsed.symptoms?.length) lines.push(`🔸 الأعراض: ${parsed.symptoms.join("، ")}`);
      if (parsed.duration) lines.push(`⏱ المدة: ${parsed.duration}`);
      if (parsed.severity) lines.push(`⚠️ severity: ${parsed.severity}`);
      if (parsed.additionalNotes) lines.push(`📝 ملاحظات إضافية: ${parsed.additionalNotes}`);
      if (parsed.doctorBrief) lines.push(`📋 ملخص للطبيب: ${parsed.doctorBrief}`);
      return lines.join("\n\n");
    } catch {
      return content;
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateDoctorProfile({
        name: editName,
        phone: editPhone,
        city: editCity,
        area: editArea,
        licenseNumber: editLicense,
        bio: editBio,
        acceptedInsurances: editInsurances,
      }, idCardFile ?? undefined, licenseDocFile ?? undefined);
      setIdCardFile(null);
      setLicenseDocFile(null);
      showToast(t("profile.saved"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadReport = async (period: "3m" | "6m" | "1y") => {
    setLoading(true);
    try {
      const r = await fetchDoctorReport(period);
      setReport(r);
      setShowReport(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل تحميل التقرير", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPatient = async (patientId: string) => {
    try {
      setLoading(true);
      const detail = await fetchDoctorPatientDetail(patientId);
      setPatientDetail(detail);
      setSelectedPatient(detail.patient);
      setPrescriptions(detail.prescriptions);
      setPatientVisits(detail.visits ?? []);
      setPatientFiles(detail.files ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل جلب بيانات المريض", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxMedication.trim()) { showToast("اسم الدواء مطلوب", "error"); return; }
    try {
      const rx = await createPrescription({
        patientId: selectedPatient?.id,
        patientName: selectedPatient?.name ?? "",
        patientPhone: selectedPatient?.phone ?? undefined,
        medicationName: rxMedication.trim(),
        dosage: rxDosage.trim() || undefined,
        frequency: rxFrequency.trim() || undefined,
        duration: rxDuration.trim() || undefined,
        notes: rxNotes.trim() || undefined,
      });
      setPrescriptions(prev => [rx, ...prev]);
      setShowPrescriptionForm(false);
      setRxMedication(""); setRxDosage(""); setRxFrequency(""); setRxDuration(""); setRxNotes("");
      showToast("تمت إضافة الوصفة الطبية بنجاح 💊", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل إضافة الوصفة", "error");
    }
  };

  const handleDeletePrescription = async (id: string) => {
    try {
      await deletePrescription(id);
      setPrescriptions(prev => prev.filter(p => p.id !== id));
      showToast("تم حذف الوصفة", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?.id) return;
    if (!visitComplaint.trim() && !visitDiagnosis.trim()) {
      showToast("اكتب سبب الزيارة أو التشخيص على الأقل", "error");
      return;
    }
    try {
      const visit = await createPatientVisit(selectedPatient.id, {
        chiefComplaint: visitComplaint.trim() || undefined,
        diagnosis: visitDiagnosis.trim() || undefined,
        treatmentPlan: visitPlan.trim() || undefined,
        notes: visitNotes.trim() || undefined,
        followUpDate: visitFollowUp || undefined,
      });
      setPatientVisits(prev => [visit, ...prev]);
      setShowVisitForm(false);
      setVisitComplaint(""); setVisitDiagnosis(""); setVisitPlan(""); setVisitNotes(""); setVisitFollowUp("");
      showToast("تم تسجيل الكشف في ملف المريض", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل تسجيل الكشف", "error");
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?.id) return;
    if (!fileTitle.trim()) {
      showToast("عنوان الملف مطلوب", "error");
      return;
    }
    try {
      const file = await uploadPatientFile(selectedPatient.id, {
        fileType,
        title: fileTitle.trim(),
        notes: fileNotes.trim() || undefined,
        file: patientFile,
      });
      setPatientFiles(prev => [file, ...prev]);
      setShowFileForm(false);
      setFileType("lab"); setFileTitle(""); setFileNotes(""); setPatientFile(null);
      showToast("تم حفظ الملف داخل ملف المريض", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل حفظ الملف", "error");
    }
  };

  const handleSubscribe = async (planId: string, yearly?: boolean) => {
    setLoading(true);
    try {
      const res = await subscribeToPlan(planId, yearly);
      showToast(`تم ${mySub?.plan_id === planId ? "تجديد" : "ترقية"} الاشتراك بنجاح إلى باقة ${res.plan} 🎉`, "success");
      const [p, s] = await Promise.all([fetchSubscriptionPlans(), fetchMySubscription()]);
      setPlans(p); setMySub(s);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل الاشتراك", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add new patient handler
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPName.trim() || !newPAge || !newPPhone.trim()) {
      showToast("يرجى ملء جميع الحقول المطلوبة", "error");
      return;
    }
    const parsedAge = parseInt(newPAge);
    if (isNaN(parsedAge) || parsedAge < 0) {
      showToast("يرجى إدخال عمر صحيح", "error");
      return;
    }
    try {
      const created = await createDoctorPatient({
        name: newPName.trim(),
        age: parsedAge,
        gender: newPGender,
        phone: newPPhone.trim(),
        history: newPHistory.trim() || undefined,
        notes: newPNotes.trim() || undefined,
      });
      setServerPatients(prev => [created, ...prev]);
      setShowAddPatient(false);
      setNewPName(""); setNewPAge(""); setNewPPhone(""); setNewPHistory(""); setNewPNotes("");
      showToast("تم تسجيل المريض الجديد بنجاح في قاعدة البيانات 📁", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل إضافة المريض", "error");
    }
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || !txCategory.trim() || !txAmount) {
      showToast("يرجى تعبئة العنوان والفئة والمبلغ", "error");
      return;
    }
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      showToast("يرجى إدخال مبلغ صحيح", "error");
      return;
    }
    try {
      const created = await createClinicFinance({
        patientId: txPatientId || undefined,
        type: txType,
        category: txCategory.trim(),
        title: txTitle.trim(),
        amount: parsedAmount,
        paymentMethod: txMethod,
        counterparty: txCounterparty.trim() || undefined,
        status: txStatus,
        dueDate: txDueDate || undefined,
        notes: txNotes.trim() || undefined,
      });
      setTransactions(prev => [created, ...prev]);
      setShowAddTx(false);
      setTxPatientId(""); setTxType("income"); setTxCategory("كشف"); setTxTitle("كشف طبي"); setTxAmount("");
      setTxMethod("نقدي"); setTxCounterparty(""); setTxStatus("paid"); setTxDueDate(""); setTxNotes("");
      showToast("تم تسجيل الحركة المالية بنجاح", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل تسجيل الحركة المالية", "error");
    }
  };

  // Calculations for dashboard
  const totalRevenue = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const unpaidTotal = transactions.filter(t => t.status !== "paid").reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const activePatientsCount = serverPatients.length;
  const pendingAppointments = appts.filter(a => a.status === "pending").length;
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appts.filter(a => a.slot.startsWith(todayDateStr)).length;
  const { t, locale, setLocale } = useI18n();

  return (
    <section className="animate-fade-in-up max-w-6xl mx-auto my-6 px-4">
      {/* Toast Notification */}
      {msg && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:w-96 z-50 rounded-2xl border p-4 shadow-xl flex items-center gap-3 animate-slide-in backdrop-blur-lg ${
          msg.type === "success" ? "bg-emerald-50/90 text-emerald-800 border-emerald-200" : "bg-rose-50/90 text-rose-800 border-rose-200"
        }`}>
          <span className="text-xl">{msg.type === "success" ? "🎉" : "⚠️"}</span>
          <p className="text-sm font-semibold">{msg.text}</p>
        </div>
      )}

      {/* Main Grid Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            {/* Platform Branding */}
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800">
              <img src={logo} alt={t("app.title")} className="h-8 w-auto object-contain" />
              <div>
                <h2 className="text-sm font-bold leading-tight">{t("app.title")}</h2>
                <p className="text-[10px] text-slate-500">{t("app.subtitle")}</p>
              </div>
            </div>
            {/* Header User Profile Card */}
            <div className="text-center pb-6 border-b border-slate-800 mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/20 text-3xl mb-3 shadow-inner">
                {doctor.image || "👨‍⚕️"}
              </div>
              <h2 className="text-md font-bold truncate">د. {doctor.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{doctor.specialty} — {doctor.hospital}</p>
              
              {/* Verification Status */}
              <div className="mt-3 flex items-center justify-center">
                {doctor.isVerified ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ✓ عيادة موثقة
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    🕟 قيد التحقق والتوثيق
                  </span>
                )}
              </div>
            </div>

            {/* Menu Links */}
            <nav className="space-y-1">
              {[
                { key: "dashboard", label: t("doctor.dashboard"), icon: "📊" },
                { key: "appointments", label: t("doctor.appointments"), icon: "📅", badge: pendingAppointments > 0 ? pendingAppointments : undefined },
                { key: "patients", label: t("doctor.patients"), icon: "👥" },
                { key: "finances", label: t("doctor.finances"), icon: "💳" },
                { key: "summaries", label: t("doctor.summaries"), icon: "📋" },
                { key: "subscription", label: t("doctor.subscription"), icon: "⭐" },
                { key: "profile", label: t("doctor.profile"), icon: "👤" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTab(m.key as Tab)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition ${
                    tab === m.key
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{m.icon}</span>
                    <span>{m.label}</span>
                  </span>
                  {m.badge && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {m.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white py-3 rounded-2xl text-xs font-semibold transition"
            >
              {locale === "ar" ? "🌐 English" : "🌐 العربية"}
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-950/40 border border-slate-700/50 hover:border-rose-900/30 text-slate-300 hover:text-rose-400 py-3 rounded-2xl text-xs font-semibold transition"
            >
              ❌ {t("profile.logout")}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Main Stats Header Dashboard */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Dynamic Clinic Card Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 text-white p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <h1 className="text-xl md:text-2xl font-bold">مرحباً بك في منصة عيادتك الذكية 👋</h1>
                <p className="text-sm text-primary-100 mt-2 max-w-lg">
                  من هنا يمكنك إدارة عيادتك بشكل كامل، تتبع المرضى، متابعة حساباتك وتلقي ملخصات الذكاء الاصطناعي لاستشارات المرضى بشكل مباشر وسلس.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => setShowAddPatient(true)} className="bg-white text-primary-800 hover:bg-primary-50 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm">
                    ＋ تسجيل مريض جديد
                  </button>
                  <button onClick={() => setShowAddTx(true)} className="bg-primary-900/50 text-white hover:bg-primary-900 px-4 py-2 rounded-xl text-xs font-bold border border-primary-500/35 transition">
                    💵 تسجيل معاملة مالية
                  </button>
                </div>
              </div>

              {/* Grid cards statistics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t("doctor.totalPatients"), value: activePatientsCount, desc: "ملف نشط", color: "from-blue-500 to-blue-600", bg: "bg-blue-50/50 text-blue-700 border-blue-100", icon: "👥" },
                  { label: t("doctor.totalAppointments"), value: todayAppointments, desc: "حجوزات عيادة", color: "from-purple-500 to-purple-600", bg: "bg-purple-50/50 text-purple-700 border-purple-100", icon: "📅" },
                  { label: t("doctor.totalRevenue"), value: `${totalRevenue} ${getCurrency()}`, desc: "مجموع الدخل", color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50/50 text-emerald-700 border-emerald-100", icon: "💳" },
                  { label: t("doctor.pendingAppointments"), value: pendingAppointments, desc: "انتظار موافقة", color: "from-amber-500 to-amber-600", bg: "bg-amber-50/50 text-amber-700 border-amber-100", icon: "🕟" },
                ].map((s, idx) => (
                  <div key={idx} className={`rounded-3xl border p-5 flex flex-col justify-between shadow-sm bg-white/80 backdrop-blur-xl ${s.bg}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-500">{s.label}</span>
                      <span className="text-xl bg-white rounded-lg p-1 shadow-sm border border-slate-100">{s.icon}</span>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-black text-slate-900">{s.value}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly Stats Row */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <p className="text-[11px] font-bold text-sky-600">📅 مواعيد الشهر الماضي</p>
                    <p className="text-2xl font-black text-sky-900 mt-1">{stats.lastMonth.appointments}</p>
                    <p className="text-[10px] text-sky-500">هذا الشهر: {stats.thisMonth.appointments}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <p className="text-[11px] font-bold text-emerald-600">💰 إيرادات الشهر الماضي</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{stats.lastMonth.revenue} {getCurrency()}</p>
                    <p className="text-[10px] text-emerald-500">هذا الشهر: {stats.thisMonth.revenue} {getCurrency()}</p>
                  </div>
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                    <p className="text-[11px] font-bold text-purple-600">👤 مرضى الشهر الماضي</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{stats.lastMonth.patients}</p>
                    <p className="text-[10px] text-purple-500">مرضى جدد</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-[11px] font-bold text-amber-600">📊 تقارير</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button onClick={() => handleLoadReport("3m")} className="text-[10px] font-bold bg-white border border-amber-200 hover:bg-amber-100 px-2 py-1.5 rounded-lg transition">3 شهور</button>
                      <button onClick={() => handleLoadReport("6m")} className="text-[10px] font-bold bg-white border border-amber-200 hover:bg-amber-100 px-2 py-1.5 rounded-lg transition">6 شهور</button>
                      <button onClick={() => handleLoadReport("1y")} className="text-[10px] font-bold bg-white border border-amber-200 hover:bg-amber-100 px-2 py-1.5 rounded-lg transition">سنوي</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard Layout columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section of appointments */}
                <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <span>📅</span> آخر المواعيد المسجلة
                    </h3>
                    <button onClick={() => setTab("appointments")} className="text-xs text-primary-600 hover:underline">عرض الكل</button>
                  </div>
                  <div className="space-y-3">
                    {appts.slice(0, 3).map((a) => (
                      <div key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{a.patient_name}</p>
                          <p className="text-slate-400 mt-0.5">{new Date(a.slot).toLocaleString("ar-SA")}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 font-bold border text-[10px] ${statusColors[a.status]}`}>
                          {statusLabels[a.status] || a.status}
                        </span>
                      </div>
                    ))}
                    {appts.length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400">{t("doctor.noAppointments")}</p>
                    )}
                  </div>
                </div>

                {/* Patient medical summary widget */}
                <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <span>📋</span> ملخصات AI الأخيرة
                    </h3>
                    <button onClick={() => setTab("summaries")} className="text-xs text-primary-600 hover:underline">عرض الكل</button>
                  </div>
                  <div className="space-y-3">
                    {summaries.slice(0, 2).map((s) => (
                      <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-slate-800">🧑 {s.patient_name}</p>
                          <span className="text-[10px] text-slate-400">{new Date(s.slot).toLocaleDateString("ar-SA")}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 leading-relaxed bg-white rounded-lg p-2 border border-slate-50">{formatSummaryContent(s.content)}</p>
                      </div>
                    ))}
                    {summaries.length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400">لا توجد تقارير AI بعد</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Report Modal */}
          {showReport && report && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900 text-base">📊 تقرير {report.periodLabel}</h3>
                  <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                    <p className="text-[11px] font-bold text-purple-600">إجمالي المواعيد</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{report.totalAppointments}</p>
                    <p className="text-[10px] text-purple-500">مكتمل: {report.completedAppointments}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-[11px] font-bold text-emerald-600">الإيرادات</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{report.totalRevenue} {getCurrency()}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[11px] font-bold text-blue-600">المرضى</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">{report.totalPatients}</p>
                    <p className="text-[10px] text-blue-500">{report.cancellations} إلغاء</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
                    <p className="text-[11px] font-bold text-sky-600">مرضى العيادة</p>
                    <p className="text-2xl font-black text-sky-900 mt-1">{report.clinicPatients}</p>
                  </div>
                  <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
                    <p className="text-[11px] font-bold text-teal-600">دخل العيادة</p>
                    <p className="text-2xl font-black text-teal-900 mt-1">{report.clinicRevenue} {getCurrency()}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[11px] font-bold text-amber-600">صافي الربح</p>
                    <p className="text-2xl font-black text-amber-900 mt-1">{report.netProfit} {getCurrency()}</p>
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-3">📈 تفصيل شهري</h4>
                <div className="space-y-2">
                  {report.monthlyBreakdown.map((m, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 text-xs border border-slate-100">
                      <span className="font-bold text-slate-700">{m.month}</span>
                      <div className="flex gap-4 text-slate-500">
                        <span>📅 {m.appointments} موعد</span>
                        <span>💰 {m.revenue} {getCurrency()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab Content */}
          {tab === "appointments" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 text-base">🗓️ إدارة مواعيد وحجوزات العيادة</h3>
              <p className="text-xs text-slate-500">يمكنك هنا مراجعة طلبات الحجز المقدمة من قبل المرضى وقبولها أو إتمامها.</p>
              
              <div className="flex flex-wrap gap-3 items-end bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">حالة الموعد</label>
                  <select className="input-field text-xs py-2 px-3 rounded-xl" value={apptStatus} onChange={e => setApptStatus(e.target.value)}>
                    <option value="">الكل</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="approved">مقبول</option>
                    <option value="completed">مكتمل</option>
                    <option value="rejected">مرفوض</option>
                    <option value="modification_requested">طلب تعديل</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={apptFrom} onChange={e => setApptFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={apptTo} onChange={e => setApptTo(e.target.value)} />
                </div>
                <button onClick={() => { setApptStatus(""); setApptFrom(""); setApptTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              
              <div className="space-y-3">
                {appts.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary-100 transition duration-300">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">{a.patient_name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 border text-[10px] font-bold ${statusColors[a.status]}`}>
                          {statusLabels[a.status] || a.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">📅 {new Date(a.slot).toLocaleString("ar-SA")}</p>
                      <div className="flex gap-4 text-[11px] text-slate-400">
                        {a.phone && <span>📞 {a.phone}</span>}
                        {a.fee !== null && a.fee !== undefined && <span className="text-emerald-600 font-semibold">💵 قيمة الكشف: {a.fee} {getCurrency()}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto border-t md:border-0 pt-2 md:pt-0">
                      {a.status === "pending" && (
                        <>
                          <button onClick={() => handleStatus(a.id, "approved")} className="flex-1 md:flex-none text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl transition">
                            {t("doctor.accept")}
                          </button>
                          <button onClick={() => handleStatus(a.id, "rejected")} className="flex-1 md:flex-none text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl transition">
                            {t("doctor.reject")}
                          </button>
                        </>
                      )}
                      {a.status === "modification_requested" && (
                        <>
                          <button onClick={() => handleStatus(a.id, "approved")} className="flex-1 md:flex-none text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition">
                            {t("doctor.acceptModification")}
                          </button>
                          <button onClick={() => handleStatus(a.id, "pending")} className="flex-1 md:flex-none text-xs font-bold text-white bg-slate-500 hover:bg-slate-600 px-4 py-2 rounded-xl transition">
                            {t("doctor.rejectModification")}
                          </button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <button onClick={() => handleStatus(a.id, "completed")} className="w-full md:w-auto text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition">
                          تحديد كمكتمل وتأكيد الحركة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {appts.length === 0 && (
                  <div className="text-center py-12 text-slate-400">{t("doctor.noAppointments")}</div>
                )}
              </div>
            </div>
          )}

          {/* Patients Tab Content */}
          {tab === "patients" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">👥 قاعدة بيانات وسجلات المرضى</h3>
                  <p className="text-xs text-slate-500">إدارة ملفات المرضى، متابعة الزيارات، وصف الأدوية.</p>
                </div>
                <button onClick={() => setShowAddPatient(true)} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition">
                  ＋ {t("doctor.addPatient")}
                </button>
              </div>

              {/* Search and date filters */}
              <div className="flex flex-wrap gap-3 items-end bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">بحث</label>
                  <input
                    type="text"
                    placeholder="🔍 ابحث عن مريض بالاسم أو رقم الهاتف..."
                    className="input-field w-full text-xs py-2 px-3 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={patientFrom} onChange={e => setPatientFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={patientTo} onChange={e => setPatientTo(e.target.value)} />
                </div>
                <button onClick={() => { setSearchQuery(""); setPatientFrom(""); setPatientTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>

              {/* Patient cards list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(searchQuery ? serverPatients.filter((p: any) =>
                  p.name.includes(searchQuery) || (p.phone && p.phone.includes(searchQuery))
                ) : serverPatients).map((p: any) => (
                  <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 hover:border-primary-100 hover:bg-white transition duration-300 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                          <p className="text-[10px] text-slate-400">{p.age ? `السن: ${p.age} سنة |` : ""} {p.gender || ""}</p>
                        </div>
                        <span className="text-xs bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                          #{p.id.slice(-4)}
                        </span>
                      </div>
                      
                      {p.history && (
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                          <p className="font-semibold text-slate-700 mb-0.5">🩺 التاريخ الطبي:</p>
                          <p className="line-clamp-2 leading-relaxed">{p.history}</p>
                        </div>
                      )}

                      {p.notes && (
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">💡 ملاحظة الطبيب: </span>{p.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="text-[11px] text-slate-400" dir="ltr">
                        {p.phone && <span>📞 {p.phone}</span>}
                      </div>
                      <button onClick={() => handleOpenPatient(p.id)} className="text-[11px] font-bold text-primary-600 hover:underline">
                        🔍 عرض التفاصيل
                      </button>
                    </div>
                  </div>
                ))}

                {serverPatients.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    {t("admin.noPatients")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Finances Tab Content */}
          {tab === "finances" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">💳 الحسابات والإدارة المالية للعيادة</h3>
                  <p className="text-xs text-slate-500">دخل الكشوفات والمصروفات التشغيلية: كهرباء، مياه، مرتبات، موردين ومواد مستخدمة.</p>
                </div>
                <button onClick={() => setShowAddTx(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition">
                  ＋ تسجيل حركة مالية
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-end bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">النوع</label>
                  <select className="input-field text-xs py-2 px-3 rounded-xl" value={financeType} onChange={e => setFinanceType(e.target.value)}>
                    <option value="">الكل</option>
                    <option value="income">دخل</option>
                    <option value="expense">مصروف</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={financeFrom} onChange={e => setFinanceFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={financeTo} onChange={e => setFinanceTo(e.target.value)} />
                </div>
                <button onClick={() => { setFinanceType(""); setFinanceFrom(""); setFinanceTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-[11px] font-bold text-emerald-600">إجمالي الدخل</p>
                  <p className="text-2xl font-black text-emerald-800 mt-1">{totalRevenue} {getCurrency()}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
                  <p className="text-[11px] font-bold text-rose-600">إجمالي المصروفات</p>
                  <p className="text-2xl font-black text-rose-800 mt-1">{totalExpenses} {getCurrency()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[11px] font-bold text-slate-600">صافي العيادة</p>
                  <p className={`text-2xl font-black mt-1 ${netProfit >= 0 ? "text-slate-900" : "text-rose-700"}`}>{netProfit} {getCurrency()}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-[11px] font-bold text-amber-600">مبالغ مستحقة</p>
                  <p className="text-2xl font-black text-amber-800 mt-1">{unpaidTotal} {getCurrency()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">سجل الحركات المالية</h4>
                <div className="overflow-hidden border border-slate-100 rounded-2xl bg-slate-50/50">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-3">البند</th>
                        <th className="p-3">الفئة</th>
                        <th className="p-3">الطرف</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-white transition">
                          <td className="p-3">
                            <p className="font-semibold text-slate-900">{t.title}</p>
                            {t.notes && <p className="text-[10px] text-slate-400 mt-0.5">{t.notes}</p>}
                          </td>
                          <td className="p-3 text-slate-500">{t.category}</td>
                          <td className="p-3">
                            <p className="text-slate-700">{t.patient_name || t.counterparty || "العيادة"}</p>
                            {t.payment_method && <p className="text-[10px] text-slate-400">{t.payment_method}</p>}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === "paid" ? "bg-emerald-100 text-emerald-800" : t.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {t.status === "paid" ? "مدفوع" : t.status === "partial" ? "جزئي" : "غير مدفوع"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">
                            {new Date(t.transaction_date).toLocaleDateString("ar-SA")}
                            {t.due_date && <p className="text-[10px] text-amber-600">استحقاق: {new Date(t.due_date).toLocaleDateString("ar-SA")}</p>}
                          </td>
                          <td className={`p-3 text-left font-black ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                            {t.type === "income" ? "+" : "-"}{t.amount} {getCurrency()}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            لا توجد أي معاملات مالية مسجلة بعد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Medical Summaries Tab Content */}
          {tab === "summaries" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 text-base">📋 ملخصات وتقارير AI للاستشارات</h3>
              <p className="text-xs text-slate-500">تقارير ملخصة ذكية ناتجة عن المحادثة التفاعلية بين المريض والمساعد الذكي.</p>
              
              <div className="flex flex-wrap gap-3 items-end bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={summaryFrom} onChange={e => setSummaryFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={summaryTo} onChange={e => setSummaryTo(e.target.value)} />
                </div>
                <button onClick={() => { setSummaryFrom(""); setSummaryTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              
              <div className="space-y-4">
                {summaries.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:border-primary-100 transition duration-300 relative">
                    <div className="mb-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-950 text-xs">🧑 المريض: {s.patient_name}</p>
                        {s.edited_at && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">✏️ تم التعديل</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">📅 {new Date(s.slot).toLocaleString("ar-SA")}</span>
                    </div>
                    {editingSummaryId === s.id ? (
                      <div className="space-y-3">
                        <textarea
                          className="input-field w-full text-xs leading-relaxed p-3 rounded-xl border border-slate-200 min-h-[200px]"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          dir="rtl"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveSummary(s.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                            💾 حفظ التعديلات
                          </button>
                          <button onClick={handleCancelEditSummary} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">
                            ❌ إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 bg-white rounded-xl p-3 border border-slate-100 shadow-inner">
                          {formatSummaryContent(s.content)}
                        </div>
                        <button onClick={() => handleEditSummary(s)} className="absolute top-2 left-2 bg-white/90 hover:bg-white border border-slate-200 text-slate-600 hover:text-primary-600 text-[10px] font-bold px-2 py-1 rounded-lg transition shadow-sm">
                          ✏️ تعديل
                        </button>
                      </div>
                    )}
                    {s.edited_at && (
                      <p className="text-[10px] text-slate-400 mt-2 text-left">آخر تعديل: {new Date(s.edited_at).toLocaleString("ar-SA")}</p>
                    )}
                  </div>
                ))}
                {summaries.length === 0 && (
                  <div className="text-center py-12 text-slate-400">لا توجد تقارير طبية متاحة حالياً.</div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Tab Content */}
          {tab === "subscription" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-6 animate-fade-in">
              <h3 className="font-bold text-slate-900 text-base font-black text-center">⭐ باقات عيادة AI الذكية</h3>
              <p className="text-xs text-slate-500 text-center max-w-md mx-auto">
                اختر الباقة المناسبة لحجم عمل عيادتك لفتح أدوات ذكاء اصطناعي متطورة ودعم عدد أكبر من المرضى.
              </p>

              {mySub && (
                <div className={`rounded-2xl border p-4 max-w-sm mx-auto flex items-center gap-3 ${
                  mySub.is_trial === 1 ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200"
                }`}>
                  <span className="text-2xl">{mySub.is_trial === 1 ? "🎁" : "👑"}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">
                      {mySub.is_trial === 1 ? `${t("doctor.trial")}: ` : `${t("doctor.currentPlan")}: `}{mySub.plan_name}
                    </p>
                    {mySub.is_trial === 1 ? (
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        متبقٍ {Math.max(0, Math.ceil((new Date(mySub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} يوم — ستنتهي في {new Date(mySub.end_date).toLocaleDateString("ar-SA")}
                      </p>
                    ) : (
                      <p className="text-[10px] text-indigo-500 mt-0.5">
                        تاريخ انتهاء الترخيص: {new Date(mySub.end_date).toLocaleDateString("ar-SA")}
                        {mySub.auto_renew === 1 && <span className="mr-2 text-emerald-600">(تجديد تلقائي)</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                {plans.map((p) => {
                  const isActive = mySub?.plan_id === p.id;
                  const isPaidPlan = p.id !== "plan_free";
                  return (
                  <div key={p.id} className={`rounded-2xl border-2 p-4 text-center transition flex flex-col justify-between ${
                    isActive ? "border-primary-500 bg-primary-50/50 shadow-md" : "border-slate-100 bg-slate-50/70"
                  }`}>
                    <div>
                      <span className="text-3xl">{p.id === "plan_free" ? "🆓" : p.id === "plan_basic" ? "⭐" : "👑"}</span>
                      <h3 className="mt-2 text-sm font-bold text-slate-900">{p.name}</h3>
                      {p.price_monthly === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">{t("doctor.freePlan")}</p>
                      ) : (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-slate-500">{p.price_monthly} {t("doctor.priceMonthly")}</p>
                          <p className="text-[10px] text-primary-500 font-semibold">{p.price_yearly} {t("doctor.priceYearly")} ({t("doctor.savings")} {Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100)}%)</p>
                        </div>
                      )}
                      
                      <ul className="mt-4 space-y-2 text-[10px] text-slate-600 text-right border-t border-slate-100 pt-3">
                        {p.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                      </ul>
                    </div>

                    <div className="mt-5 space-y-2">
                      {isActive && (
                        <span className="inline-block text-[11px] font-bold text-primary-600 bg-white px-3 py-1 rounded-full border border-primary-200 w-full">
                          ✅ {t("doctor.currentPlan")}
                        </span>
                      )}
                      {isActive && isPaidPlan && (
                        <button onClick={() => handleSubscribe(p.id)} disabled={loading} className="btn-primary w-full text-xs py-2 shadow-md bg-indigo-600 hover:bg-indigo-700">
                          🔄 {t("doctor.renew")} ({t("doctor.monthly")})
                        </button>
                      )}
                      {isActive && isPaidPlan && (
                        <button onClick={() => handleSubscribe(p.id, true)} disabled={loading} className="btn-primary w-full text-xs py-2 shadow-md bg-emerald-600 hover:bg-emerald-700">
                          🔄 {t("doctor.renew")} ({t("doctor.yearly")} - {t("doctor.savings")} {Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100)}%)
                        </button>
                      )}
                      {!isActive && isPaidPlan && (
                        <>
                          <button onClick={() => handleSubscribe(p.id)} disabled={loading} className="btn-primary w-full text-xs py-2 shadow-md">
                            📦 {t("doctor.upgrade")} ({t("doctor.monthly")})
                          </button>
                          <button onClick={() => handleSubscribe(p.id, true)} disabled={loading} className="btn-primary w-full text-xs py-2 shadow-md bg-emerald-600 hover:bg-emerald-700">
                            📦 {t("doctor.upgrade")} ({t("doctor.yearly")} - {t("doctor.savings")} {Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100)}%)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile Tab Content */}
          {tab === "profile" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm space-y-6 animate-fade-in">
              <h3 className="font-bold text-slate-900 text-base">👤 {t("doctor.profile")}</h3>
              
              {/* Documents display block */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3">🗂️ المستندات الرسمية والتوثيق</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                    <p className="font-bold text-slate-800">🪪 {t("doctor.idCard")}:</p>
                    {doctor.idCardPath ? (
                      <div className="mt-2 flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 truncate max-w-[150px]">{doctor.idCardPath}</span>
                        <a href={uploadUrl(doctor.idCardPath)} target="_blank" rel="noreferrer" className="text-primary-600 font-bold hover:underline">
                          عرض المستند 👁️
                        </a>
                      </div>
                    ) : (
                      <p className="text-slate-400 mt-1">لم يتم رفع مستند الهوية.</p>
                    )}
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary-50 py-1.5 text-[10px] font-bold text-primary-700 hover:bg-primary-100">
                      📤 {doctor.idCardPath ? t("doctor.replaceIdCard") : t("doctor.uploadIdCard")}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {idCardFile && <p className="mt-1 text-[10px] text-emerald-600">{idCardFile.name} ✓</p>}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                    <p className="font-bold text-slate-800">📜 {t("doctor.license")}:</p>
                    {doctor.licenseDocPath ? (
                      <div className="mt-2 flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 truncate max-w-[150px]">{doctor.licenseDocPath}</span>
                        <a href={uploadUrl(doctor.licenseDocPath)} target="_blank" rel="noreferrer" className="text-primary-600 font-bold hover:underline">
                          عرض المستند 👁️
                        </a>
                      </div>
                    ) : (
                      <p className="text-slate-400 mt-1">لم يتم رفع تصريح مزاولة العمل.</p>
                    )}
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary-50 py-1.5 text-[10px] font-bold text-primary-700 hover:bg-primary-100">
                      📤 {doctor.licenseDocPath ? t("doctor.replaceLicense") : t("doctor.uploadLicense")}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setLicenseDocFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {licenseDocFile && <p className="mt-1 text-[10px] text-emerald-600">{licenseDocFile.name} ✓</p>}
                  </div>
                </div>
              </div>

              {/* Form editing profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">اسم الطبيب</label>
                  <input className="input-field w-full text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">التخصص الطبي</label>
                  <input className="input-field w-full bg-slate-100 text-slate-400 text-xs" value={doctor.specialty} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("doctor.email")}</label>
                  <input className="input-field w-full bg-slate-100 text-slate-400 text-xs" dir="ltr" value={doctor.email} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">المستشفى / العيادة</label>
                  <input className="input-field w-full bg-slate-100 text-slate-400 text-xs" value={doctor.hospital} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("doctor.phone")}</label>
                  <input className="input-field w-full text-xs" dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">المدينة</label>
                  <input className="input-field w-full text-xs" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">المنطقة</label>
                  <input className="input-field w-full text-xs" value={editArea} onChange={(e) => setEditArea(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">رقم رخصة مزاولة المهنة</label>
                  <input className="input-field w-full text-xs" dir="ltr" value={editLicense} onChange={(e) => setEditLicense(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">نبذة تعريفية سريعة</label>
                  <textarea className="input-field w-full min-h-[80px] text-xs" value={editBio} onChange={(e) => setEditBio(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">🛡️ شركات التأمين المتعاقد معها</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editInsurances.map((ins) => (
                      <span key={ins} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                        {ins}
                        <button type="button" onClick={() => setEditInsurances((prev) => prev.filter((i) => i !== ins))} className="text-emerald-400 hover:text-red-500 transition mr-1">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-field flex-1 text-xs" placeholder="أضف شركة تأمين مثل: بوبا، التعاونية، التأمين الصحي..." value={newInsurance} onChange={(e) => setNewInsurance(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const trimmed = newInsurance.trim(); if (trimmed && !editInsurances.includes(trimmed)) { setEditInsurances((prev) => [...prev, trimmed]); setNewInsurance(""); } } }} />
                    <button type="button" className="btn-primary text-xs px-4 py-2 whitespace-nowrap" onClick={() => { const trimmed = newInsurance.trim(); if (trimmed && !editInsurances.includes(trimmed)) { setEditInsurances((prev) => [...prev, trimmed]); setNewInsurance(""); } }}>
                      ＋ إضافة
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleSaveProfile} disabled={loading} className="btn-primary w-full text-xs py-3 shadow-lg">
                {t("profile.save")}
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Add Patient Modal overlay */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">＋ تسجيل ملف مريض جديد بالعيادة</h3>
              <button onClick={() => setShowAddPatient(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="space-y-3 text-xs text-right">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الاسم الكامل للمريض *</label>
                <input required className="input-field w-full" value={newPName} onChange={(e) => setNewPName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">العمر (سنوات) *</label>
                  <input type="number" required className="input-field w-full" value={newPAge} onChange={(e) => setNewPAge(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الجنس *</label>
                  <select className="input-field w-full" value={newPGender} onChange={(e) => setNewPGender(e.target.value as "ذكر" | "أنثى")}>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">رقم الهاتف للاتصال *</label>
                <input required className="input-field w-full" dir="ltr" value={newPPhone} onChange={(e) => setNewPPhone(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">التاريخ المرضي والأمراض المزمنة</label>
                <textarea className="input-field w-full min-h-[50px]" placeholder="مثال: مريض سكري أو يعاني من الربو..." value={newPHistory} onChange={(e) => setNewPHistory(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">ملاحظات الطبيب والحساسية</label>
                <textarea className="input-field w-full min-h-[50px]" placeholder="مثال: حساسية من عقار معين أو طعام..." value={newPNotes} onChange={(e) => setNewPNotes(e.target.value)} />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button type="submit" className="flex-1 btn-primary py-2.5">
                  {t("common.save")}
                </button>
                <button type="button" onClick={() => setShowAddPatient(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl py-2.5 font-bold">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">🩺 ملف المريض: {selectedPatient.name}</h3>
              <button onClick={() => { setSelectedPatient(null); setPatientDetail(null); setPrescriptions([]); setPatientVisits([]); setPatientFiles([]); }} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">الاسم</span>
                <p className="font-bold text-slate-900">{selectedPatient.name}</p>
              </div>
              {selectedPatient.phone && <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">رقم الجوال</span>
                <p className="font-bold text-slate-900" dir="ltr">{selectedPatient.phone}</p>
              </div>}
              {selectedPatient.age && <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">العمر</span>
                <p className="font-bold text-slate-900">{selectedPatient.age} سنة</p>
              </div>}
              {selectedPatient.gender && <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">الجنس</span>
                <p className="font-bold text-slate-900">{selectedPatient.gender}</p>
              </div>}
              <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                <span className="text-slate-500">تاريخ التسجيل</span>
                <p className="font-bold text-slate-900">{new Date(selectedPatient.created_at).toLocaleDateString("ar-SA")}</p>
              </div>
            </div>

            {/* Medical history */}
            {selectedPatient.history && (
              <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl text-xs">
                <p className="font-bold text-amber-800 mb-1">🩺 {t("doctor.medicalHistory")}:</p>
                <p className="text-amber-700">{selectedPatient.history}</p>
              </div>
            )}
            {selectedPatient.notes && (
              <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-xl text-xs">
                <p className="font-bold text-sky-800 mb-1">💡 ملاحظات الطبيب:</p>
                <p className="text-sky-700">{selectedPatient.notes}</p>
              </div>
            )}

            {/* Appointment history */}
            {patientDetail?.appointments && patientDetail.appointments.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">📅 {t("doctor.appointmentHistory")}</h4>
                <div className="space-y-2">
                  {patientDetail.appointments.map((a: any) => (
                    <div key={a.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{new Date(a.slot).toLocaleDateString("ar-SA")}</p>
                        <p className="text-slate-400">{new Date(a.slot).toLocaleTimeString("ar-SA")}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 font-bold border text-[10px] ${statusColors[a.status] || "bg-slate-100 text-slate-600"}`}>
                        {statusLabels[a.status] || a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {patientDetail?.appointments && patientDetail.appointments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">لا توجد زيارات سابقة</p>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-800 text-xs">🧾 الكشوفات والزيارات الطبية</h4>
                <button onClick={() => setShowVisitForm(true)} className="text-[10px] font-bold text-primary-600 hover:underline">＋ تسجيل كشف</button>
              </div>
              {patientVisits.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">لا توجد كشوفات مسجلة في ملف العيادة</p>
              )}
              <div className="space-y-2">
                {patientVisits.map((v: any) => (
                  <div key={v.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-slate-900">{v.chief_complaint || "كشف عيادة"}</p>
                      <span className="text-[10px] text-slate-400">{new Date(v.visit_date).toLocaleDateString("ar-SA")}</span>
                    </div>
                    {v.diagnosis && <p className="text-slate-600"><span className="font-semibold">التشخيص: </span>{v.diagnosis}</p>}
                    {v.treatment_plan && <p className="text-slate-600"><span className="font-semibold">الخطة: </span>{v.treatment_plan}</p>}
                    {v.follow_up_date && <p className="text-primary-700">متابعة: {new Date(v.follow_up_date).toLocaleDateString("ar-SA")}</p>}
                    {v.notes && <p className="text-slate-400">{v.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {showVisitForm && (
              <form onSubmit={handleAddVisit} className="border border-primary-100 bg-primary-50/40 p-4 rounded-2xl space-y-3 text-xs">
                <h5 className="font-bold text-primary-800">＋ تسجيل كشف جديد</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">سبب الزيارة / الشكوى</label>
                    <input className="input-field w-full" value={visitComplaint} onChange={(e) => setVisitComplaint(e.target.value)} placeholder="مثال: ألم بالبطن منذ يومين" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">التشخيص</label>
                    <input className="input-field w-full" value={visitDiagnosis} onChange={(e) => setVisitDiagnosis(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">الخطة العلاجية</label>
                    <textarea className="input-field w-full min-h-[70px]" value={visitPlan} onChange={(e) => setVisitPlan(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">موعد المتابعة</label>
                    <input type="date" className="input-field w-full" value={visitFollowUp} onChange={(e) => setVisitFollowUp(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">ملاحظات</label>
                    <input className="input-field w-full" value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 font-bold">حفظ الكشف</button>
                  <button type="button" onClick={() => setShowVisitForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-2 font-bold">{t("common.cancel")}</button>
                </div>
              </form>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-800 text-xs">📂 ملفات المريض: وصفات، أشعات، تحاليل وتقارير</h4>
                <button onClick={() => setShowFileForm(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">＋ إضافة ملف</button>
              </div>
              {patientFiles.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">لا توجد ملفات مرفقة بعد</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {patientFiles.map((f: any) => (
                  <div key={f.id} className="bg-white border border-slate-100 p-3 rounded-xl text-xs">
                    <div className="flex justify-between gap-2">
                      <p className="font-bold text-slate-900">{f.title}</p>
                      <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                        {f.file_type === "xray" ? "أشعة" : f.file_type === "lab" ? "تحليل" : f.file_type === "prescription" ? "وصفة" : f.file_type === "report" ? "تقرير" : "أخرى"}
                      </span>
                    </div>
                    {f.notes && <p className="text-slate-500 mt-1">{f.notes}</p>}
                    {f.file_path && (
                      <a href={uploadUrl(f.file_path)} target="_blank" rel="noreferrer" className="inline-block mt-2 text-primary-600 font-bold hover:underline">
                        فتح الملف
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {showFileForm && (
              <form onSubmit={handleAddFile} className="border border-indigo-100 bg-indigo-50/40 p-4 rounded-2xl space-y-3 text-xs">
                <h5 className="font-bold text-indigo-800">＋ إضافة ملف إلى سجل المريض</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">نوع الملف</label>
                    <select className="input-field w-full" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                      <option value="lab">تحاليل</option>
                      <option value="xray">أشعات</option>
                      <option value="prescription">وصفة طبية</option>
                      <option value="report">تقرير طبي</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">عنوان الملف *</label>
                    <input required className="input-field w-full" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">رفع صورة أو PDF</label>
                    <input type="file" accept="image/*,.pdf" className="input-field w-full text-xs" onChange={(e) => setPatientFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">ملاحظات</label>
                    <input className="input-field w-full" value={fileNotes} onChange={(e) => setFileNotes(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-bold">حفظ الملف</button>
                  <button type="button" onClick={() => setShowFileForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-2 font-bold">{t("common.cancel")}</button>
                </div>
              </form>
            )}

            {/* Prescriptions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-800 text-xs">💊 {t("doctor.prescriptions")}</h4>
                <button onClick={() => setShowPrescriptionForm(true)} className="text-[10px] font-bold text-emerald-600 hover:underline">＋ {t("doctor.addPrescription")}</button>
              </div>
              {prescriptions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">لا توجد أدوية موصوفة بعد</p>
              )}
              <div className="space-y-2">
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="bg-white border border-slate-100 p-3 rounded-xl text-xs flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-slate-900">{rx.medication_name}</p>
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                        {rx.dosage && <span>💧 {t("doctor.dosage")}: {rx.dosage}</span>}
                        {rx.frequency && <span>⏰ {t("doctor.frequency")}: {rx.frequency}</span>}
                        {rx.duration && <span>📆 {t("doctor.duration")}: {rx.duration}</span>}
                      </div>
                      {rx.notes && <p className="text-slate-400">{rx.notes}</p>}
                      <p className="text-[9px] text-slate-300">{new Date(rx.created_at).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <button onClick={() => handleDeletePrescription(rx.id)} className="text-rose-400 hover:text-rose-600 text-xs mr-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Prescription Form */}
            {showPrescriptionForm && (
              <form onSubmit={handleAddPrescription} className="border border-emerald-100 bg-emerald-50/50 p-4 rounded-2xl space-y-3 text-xs">
                <h5 className="font-bold text-emerald-800">＋ {t("doctor.addPrescription")}</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">{t("doctor.medicationName")} *</label>
                    <input required className="input-field w-full" value={rxMedication} onChange={(e) => setRxMedication(e.target.value)} placeholder="مثال: أموكسيسيلين 500مغ" />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">{t("doctor.dosage")}</label>
                    <input className="input-field w-full" value={rxDosage} onChange={(e) => setRxDosage(e.target.value)} placeholder="مثال: قرص واحد" />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">{t("doctor.frequency")}</label>
                    <input className="input-field w-full" value={rxFrequency} onChange={(e) => setRxFrequency(e.target.value)} placeholder="مثال: 3 مرات يومياً" />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">{t("doctor.duration")}</label>
                    <input className="input-field w-full" value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} placeholder="مثال: 7 أيام" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">{t("doctor.notes")}</label>
                    <input className="input-field w-full" value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} placeholder="مثال: يؤخذ بعد الأكل" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 font-bold">💾 {t("common.save")}</button>
                  <button type="button" onClick={() => setShowPrescriptionForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-2 font-bold">{t("common.cancel")}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Transaction/Invoice Modal overlay */}
      {showAddTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">💳 تسجيل حركة مالية للعيادة</h3>
              <button onClick={() => setShowAddTx(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleAddTxSubmit} className="space-y-3 text-xs text-right">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">نوع الحركة *</label>
                  <select className="input-field w-full" value={txType} onChange={(e) => {
                    const next = e.target.value as "income" | "expense";
                    setTxType(next);
                    setTxCategory(next === "income" ? "كشف" : "مرافق");
                    setTxTitle(next === "income" ? "كشف طبي" : "مصروف عيادة");
                  }}>
                    <option value="income">دخل</option>
                    <option value="expense">مصروف</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الفئة *</label>
                  <select className="input-field w-full" value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                    {txType === "income" ? (
                      <>
                        <option value="كشف">كشف</option>
                        <option value="متابعة">متابعة</option>
                        <option value="إجراء طبي">إجراء طبي</option>
                        <option value="تأمين">تأمين</option>
                        <option value="أخرى">أخرى</option>
                      </>
                    ) : (
                      <>
                        <option value="مرافق">كهرباء / مياه</option>
                        <option value="مرتبات">مرتبات</option>
                        <option value="موردين">موردين</option>
                        <option value="مواد عيادة">مواد مستخدمة</option>
                        <option value="إيجار">إيجار</option>
                        <option value="صيانة">صيانة</option>
                        <option value="أخرى">أخرى</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block font-semibold text-slate-700">عنوان البند *</label>
                  <input required className="input-field w-full" value={txTitle} onChange={(e) => setTxTitle(e.target.value)} placeholder="مثال: فاتورة كهرباء يونيو / كشف مريض" />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">المبلغ ({getCurrency()}) *</label>
                  <input type="number" required className="input-field w-full" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">طريقة السداد</label>
                  <select className="input-field w-full" value={txMethod} onChange={(e) => setTxMethod(e.target.value)}>
                    <option value="نقدي">نقدي</option>
                    <option value="بطاقة ائتمان">بطاقة ائتمان</option>
                    <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك</option>
                  </select>
                </div>
                {txType === "income" && (
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">ربط بمريض</label>
                    <select className="input-field w-full" value={txPatientId} onChange={(e) => setTxPatientId(e.target.value)}>
                      <option value="">بدون ربط</option>
                      {serverPatients.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{txType === "income" ? "جهة الدفع" : "المورد / الموظف / الجهة"}</label>
                  <input className="input-field w-full" value={txCounterparty} onChange={(e) => setTxCounterparty(e.target.value)} placeholder="مثال: شركة الكهرباء، المورد، اسم الموظف" />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">حالة السداد</label>
                  <select className="input-field w-full" value={txStatus} onChange={(e) => setTxStatus(e.target.value as any)}>
                    <option value="paid">مدفوع</option>
                    <option value="partial">مدفوع جزئياً</option>
                    <option value="unpaid">غير مدفوع</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">تاريخ الاستحقاق</label>
                  <input type="date" className="input-field w-full" value={txDueDate} onChange={(e) => setTxDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">ملاحظات</label>
                <textarea className="input-field w-full min-h-[70px]" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="رقم الفاتورة، تفاصيل المورد، بنود المواد، أو أي ملاحظة محاسبية" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button type="submit" className="flex-1 btn-primary py-2.5 bg-emerald-600 hover:bg-emerald-700">
                  حفظ الحركة المالية
                </button>
                <button type="button" onClick={() => setShowAddTx(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl py-2.5 font-bold">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
