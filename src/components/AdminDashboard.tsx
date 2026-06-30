import { useEffect, useState } from "react";
import { getCurrency } from "../utils";
import {
  fetchAdminDashboard,
  fetchAdminReport,
  fetchAdminGroupedConversations,
  fetchAdminConversations,
  fetchAdminConversation,
  fetchAdminDoctors,
  fetchAdminDoctorDetail,
  updateAdminDoctor,
  deleteAdminDoctor,
  assignDoctorSubscription,
  fetchAdminPatients,
  fetchAdminPatientDetail,
  fetchAdminAppointments,
  updateAdminAppointment,
  fetchAdminSubscriptions,
  fetchAdminSubscriptionPlans,
  fetchAdminAdmins,
  createAdminAdmin,
  deleteAdminAdmin,
  changeAdminPassword,
  changeDoctorPassword,
  changePatientPassword,
  exportAdminDoctors,
  importAdminDoctors,
} from "../api-admin";
import type { AdminDashboardStats } from "../api-admin";
import type { AdminReport } from "../types";
import { useI18n } from "../i18n";
import { getStatusLabel } from "../utils";
import logo from "../logo.png";

type Props = { admin: { name: string }; onLogout: () => void };
type Tab = "dashboard" | "conversations" | "doctors" | "patients" | "appointments" | "subscriptions" | "admins";

export function AdminDashboard({ admin, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [dashError, setDashError] = useState("");
  const [report, setReport] = useState<AdminReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Conversations
  const [convs, setConvs] = useState<any[]>([]);
  const [convTotal, setConvTotal] = useState(0);
  const [convPage, setConvPage] = useState(1);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [groupedView, setGroupedView] = useState(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [selectedUserConvs, setSelectedUserConvs] = useState<any[] | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);

  // Doctors
  const [doctors, setDoctors] = useState<any[]>([]);
  const [editDoctor, setEditDoctor] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [doctorDetail, setDoctorDetail] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subAssignDoctor, setSubAssignDoctor] = useState<string | null>(null);
  const [subAssignPlan, setSubAssignPlan] = useState("");
  const [subAssignEnd, setSubAssignEnd] = useState("");

  // Patients
  const [patients, setPatients] = useState<any[]>([]);
  const [patientDetail, setPatientDetail] = useState<any>(null);

  // Appointments
  const [appts, setAppts] = useState<any[]>([]);
  const [apptStatus, setApptStatus] = useState("");
  const [apptSearch, setApptSearch] = useState("");
  const [apptFrom, setApptFrom] = useState("");
  const [apptTo, setApptTo] = useState("");
  const [editAppt, setEditAppt] = useState<any>(null);
  const [editApptForm, setEditApptForm] = useState<any>({});

  // Filters
  const [convFrom, setConvFrom] = useState("");
  const [convTo, setConvTo] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [docVerified, setDocVerified] = useState("");
  const [docFrom, setDocFrom] = useState("");
  const [docTo, setDocTo] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFrom, setPatientFrom] = useState("");
  const [patientTo, setPatientTo] = useState("");
  const [subActive, setSubActive] = useState("");
  const [subFrom, setSubFrom] = useState("");
  const [subTo, setSubTo] = useState("");

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Admins
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [showNewAdminForm, setShowNewAdminForm] = useState(false);

  // Password change
  const [pwdTarget, setPwdTarget] = useState<{ type: "admin" | "doctor" | "patient"; id: string; name: string } | null>(null);
  const [pwdValue, setPwdValue] = useState("");

  const { t, locale, setLocale } = useI18n();

  const showToast = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadTab = (t: Tab) => {
    setLoading(true);
    if (t === "dashboard") {
      setDashError("");
      fetchAdminDashboard().then((s) => { setStats(s); setDashError(""); }).catch((e) => { setDashError(e.message); }).finally(() => setLoading(false));
    } else if (t === "conversations") {
      if (groupedView) {
        fetchAdminGroupedConversations().then(setUserGroups).catch(() => {}).finally(() => setLoading(false));
      } else {
        fetchAdminConversations(convPage, 20, { from: convFrom || undefined, to: convTo || undefined }).then((r) => { setConvs(r.conversations); setConvTotal(r.total); }).catch(() => {}).finally(() => setLoading(false));
      }
    } else if (t === "doctors") {
      fetchAdminDoctors({ search: docSearch || undefined, verified: docVerified || undefined, from: docFrom || undefined, to: docTo || undefined }).then(setDoctors).catch(() => {}).finally(() => setLoading(false));
      fetchAdminSubscriptionPlans().then(setSubscriptionPlans).catch(() => {});
    } else if (t === "patients") {
      fetchAdminPatients({ search: patientSearch || undefined, from: patientFrom || undefined, to: patientTo || undefined }).then(setPatients).catch(() => {}).finally(() => setLoading(false));
    } else if (t === "appointments") {
      fetchAdminAppointments({ status: apptStatus || undefined, search: apptSearch || undefined, from: apptFrom || undefined, to: apptTo || undefined }).then(setAppts).catch(() => {}).finally(() => setLoading(false));
    } else if (t === "subscriptions") {
      fetchAdminSubscriptions({ active: subActive || undefined, from: subFrom || undefined, to: subTo || undefined }).then(setSubscriptions).catch(() => {}).finally(() => setLoading(false));
    } else if (t === "admins") {
      fetchAdminAdmins().then(setAdmins).catch(() => {}).finally(() => setLoading(false));
    }
  };

  useEffect(() => { loadTab(tab); }, [tab]);
  useEffect(() => { if (tab === "conversations") loadTab("conversations"); }, [groupedView, convPage, convFrom, convTo]);
  useEffect(() => { if (tab === "doctors") loadTab("doctors"); }, [docSearch, docVerified, docFrom, docTo]);
  useEffect(() => { if (tab === "patients") loadTab("patients"); }, [patientSearch, patientFrom, patientTo]);
  useEffect(() => { if (tab === "appointments") loadTab("appointments"); }, [apptStatus, apptSearch, apptFrom, apptTo]);
  useEffect(() => { if (tab === "subscriptions") loadTab("subscriptions"); }, [subActive, subFrom, subTo]);

  const handleOpenConv = async (id: string) => {
    setLoading(true);
    try {
      const conv = await fetchAdminConversation(id);
      setSelectedConv(conv);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserConversations = async (userId: string, userInfo: any) => {
    setLoading(true);
    try {
      const r = await fetchAdminConversations(1, 100);
      const userConvs = r.conversations.filter((c: any) => c.user_id === userId);
      setSelectedUserConvs(userConvs);
      setSelectedUserInfo(userInfo);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoctor = async () => {
    if (!editDoctor) return;
    setLoading(true);
    try {
      await updateAdminDoctor(editDoctor.id, editForm);
      showToast(t("common.success"), "success");
      setDoctors((prev) => prev.map((d) => (d.id === editDoctor.id ? { ...d, ...editForm } : d)));
      setEditDoctor(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm(t("common.confirm"))) return;
    setLoading(true);
    try {
      await deleteAdminDoctor(id);
      showToast(t("common.success"), "success");
      setDoctors((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportDoctors = async () => {
    try {
      await exportAdminDoctors();
      showToast(t("common.success"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    }
  };

  const handleImportDoctors = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const result = await importAdminDoctors(text);
      showToast(t("admin.importSuccess", { count: result.imported }), "success");
      fetchAdminDoctors().then(setDoctors).catch(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("admin.importError"), "error");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleViewDoctorDetail = async (id: string) => {
    setLoading(true);
    try {
      const detail = await fetchAdminDoctorDetail(id);
      setDoctorDetail(detail);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubscription = async () => {
    if (!subAssignDoctor || !subAssignPlan) return;
    setLoading(true);
    try {
      await assignDoctorSubscription(subAssignDoctor, subAssignPlan, subAssignEnd || undefined);
      showToast(t("common.success"), "success");
      setSubAssignDoctor(null);
      setSubAssignPlan("");
      setSubAssignEnd("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadReport = async (period: "3m" | "6m" | "1y") => {
    setLoading(true);
    try {
      const r = await fetchAdminReport(period);
      setReport(r);
      setShowReport(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "فشل تحميل التقرير", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = async (id: string) => {
    setLoading(true);
    try {
      const detail = await fetchAdminPatientDetail(id);
      setPatientDetail(detail);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApptUpdate = async () => {
    if (!editAppt) return;
    setLoading(true);
    try {
      await updateAdminAppointment(editAppt.id, editApptForm);
      showToast(t("common.success"), "success");
      setAppts((prev) => prev.map((a) => (a.id === editAppt.id ? { ...a, ...editApptForm } : a)));
      setEditAppt(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApptStatus = async (id: string, status: string) => {
    setLoading(true);
    try {
      await updateAdminAppointment(id, { status });
      showToast(t("common.success"), "success");
      setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return;
    setLoading(true);
    try {
      await createAdminAdmin(newAdmin.name, newAdmin.email, newAdmin.password);
      showToast(t("common.success"), "success");
      setNewAdmin({ name: "", email: "", password: "" });
      setShowNewAdminForm(false);
      const a = await fetchAdminAdmins();
      setAdmins(a);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdTarget || pwdValue.length < 4) return;
    setLoading(true);
    try {
      if (pwdTarget.type === "admin") await changeAdminPassword(pwdTarget.id, pwdValue);
      else if (pwdTarget.type === "doctor") await changeDoctorPassword(pwdTarget.id, pwdValue);
      else await changePatientPassword(pwdTarget.id, pwdValue);
      showToast(t("admin.passwordChangeSuccess"), "success");
      setPwdTarget(null);
      setPwdValue("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm(t("common.confirm"))) return;
    setLoading(true);
    try {
      await deleteAdminAdmin(id);
      showToast(t("common.success"), "success");
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "dashboard", label: t("admin.dashboard"), icon: "📊" },
    { key: "conversations", label: t("admin.conversations"), icon: "💬" },
    { key: "doctors", label: t("admin.doctors"), icon: "👨‍⚕️" },
    { key: "patients", label: t("admin.patients"), icon: "👥" },
    { key: "appointments", label: t("admin.appointments"), icon: "📅" },
    { key: "subscriptions", label: t("admin.subscriptions"), icon: "⭐" },
    { key: "admins", label: t("admin.admins"), icon: "🔐" },
  ] as const;

  return (
    <section className="max-w-7xl mx-auto my-6 px-4">
      {msg && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:w-96 z-50 rounded-2xl border p-4 shadow-xl flex items-center gap-3 animate-slide-in backdrop-blur-lg ${
          msg.type === "success" ? "bg-emerald-50/90 text-emerald-800 border-emerald-200" : "bg-rose-50/90 text-rose-800 border-rose-200"
        }`}>
          <span className="text-xl">{msg.type === "success" ? "✅" : "⚠️"}</span>
          <p className="text-sm font-semibold">{msg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">

        {/* Sidebar */}
        <aside className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800">
              <img src={logo} alt={t("app.title")} className="h-7 w-auto" />
              <div>
                <h2 className="text-sm font-bold">{t("app.title")}</h2>
                <p className="text-[10px] text-slate-500">{t("admin.dashboard")}</p>
              </div>
            </div>
            <div className="text-center pb-4 mb-4 border-b border-slate-800">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-2xl mb-2">🔐</div>
              <p className="text-xs text-slate-400 mt-1">{admin.name}</p>
            </div>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => { setTab(t.key); setSelectedConv(null); setEditDoctor(null); setDoctorDetail(null); setPatientDetail(null); setEditAppt(null); setSelectedUserConvs(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                    tab === t.key ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="space-y-2">
            <button onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white py-3 rounded-2xl text-xs font-semibold transition">
              {locale === "ar" ? "🌐 English" : "🌐 العربية"}
            </button>
            <button onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-950/40 border border-slate-700/50 text-slate-300 hover:text-rose-400 py-3 rounded-2xl text-xs font-semibold transition">
              ❌ {t("header.logout")}
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="lg:col-span-4 space-y-6">

          {/* ===== DASHBOARD ===== */}
          {tab === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-gradient-to-l from-amber-600 via-amber-700 to-slate-800 text-white p-6 shadow-xl">
                <h1 className="text-xl font-bold">📊 {t("admin.dashboard")}</h1>
                <p className="text-sm text-amber-100 mt-1">{t("admin.dashboard")}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t("admin.totalUsers"), value: stats.totalUsers, icon: "👥", color: "bg-blue-50 text-blue-700 border-blue-100" },
                  { label: t("admin.totalDoctors"), value: stats.totalDoctors, sub: `${stats.verifiedDoctors} ${t("admin.verified")}`, icon: "👨‍⚕️", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                  { label: t("admin.totalAppointments"), value: stats.totalAppointments, sub: `${stats.pendingAppointments} ${t("status.pending")}`, icon: "📅", color: "bg-purple-50 text-purple-700 border-purple-100" },
                  { label: t("admin.totalConversations"), value: stats.totalConversations, icon: "💬", color: "bg-cyan-50 text-cyan-700 border-cyan-100" },
                  { label: t("admin.totalDoctorRevenue"), value: `${stats.totalDoctorRevenue} ${getCurrency()}`, icon: "🩺", color: "bg-sky-50 text-sky-700 border-sky-100" },
                  { label: t("admin.totalPlatformRevenue"), value: `${stats.totalPlatformRevenue} ${getCurrency()}`, icon: "🏢", color: "bg-amber-50 text-amber-700 border-amber-100" },
                  { label: t("admin.activeSubscriptions"), value: stats.activeSubscriptions, icon: "⭐", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
                  { label: t("admin.totalAdmins"), value: stats.totalAdmins, icon: "🔐", color: "bg-teal-50 text-teal-700 border-teal-100" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-2xl border p-4 ${s.color}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold opacity-70">{s.label}</span>
                      <span className="text-xl">{s.icon}</span>
                    </div>
                    <p className="text-2xl font-black mt-2">{s.value}</p>
                    {s.sub && <p className="text-[10px] opacity-70 mt-0.5">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Monthly Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-[11px] font-bold text-blue-600">👥 مستخدمين جدد (الشهر الماضي)</p>
                  <p className="text-2xl font-black text-blue-900 mt-1">{stats.lastMonth.users}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-[11px] font-bold text-emerald-600">👨‍⚕️ أطباء جدد (الشهر الماضي)</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{stats.lastMonth.doctors}</p>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <p className="text-[11px] font-bold text-purple-600">📅 مواعيد (الشهر الماضي)</p>
                  <p className="text-2xl font-black text-purple-900 mt-1">{stats.lastMonth.appointments}</p>
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
            </div>
          )}
          {tab === "dashboard" && loading && <p className="text-center text-slate-400 py-12">{t("common.loading")}</p>}
          {tab === "dashboard" && !stats && !loading && dashError && (
            <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 text-center">
              <p className="text-rose-700 font-bold text-sm">⚠️ تعذر تحميل البيانات</p>
              <p className="text-rose-500 text-xs mt-1">{dashError}</p>
              <button onClick={() => loadTab("dashboard")} className="mt-4 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition">إعادة المحاولة</button>
            </div>
          )}
          {tab === "dashboard" && !stats && !loading && !dashError && (
            <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6 text-center">
              <p className="text-amber-700 font-bold text-sm">⚠️ لا توجد بيانات بعد</p>
              <p className="text-amber-500 text-xs mt-1">يبدو أن قاعدة البيانات فارغة، أو أن السيرفر لم يكمل التهيئة.</p>
              <button onClick={() => loadTab("dashboard")} className="mt-4 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition">إعادة المحاولة</button>
            </div>
          )}

          {/* Report Modal */}
          {showReport && report && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900 text-base">📊 تقرير المنصة — {report.periodLabel}</h3>
                  <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[11px] font-bold text-blue-600">إجمالي المستخدمين</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">{report.totalUsers}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-[11px] font-bold text-emerald-600">إجمالي الأطباء</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{report.totalDoctors}</p>
                  </div>
                  <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                    <p className="text-[11px] font-bold text-purple-600">إجمالي المواعيد</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{report.totalAppointments}</p>
                    <p className="text-[10px] text-purple-500">مكتمل: {report.completedAppointments}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-[11px] font-bold text-emerald-600">الإيرادات</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{report.totalRevenue} {getCurrency()}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-4">
                    <p className="text-[11px] font-bold text-cyan-600">المحادثات</p>
                    <p className="text-2xl font-black text-cyan-900 mt-1">{report.totalConversations}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[11px] font-bold text-amber-600">أطباء نشطون</p>
                    <p className="text-2xl font-black text-amber-900 mt-1">{report.activeDoctors}</p>
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-3">📈 تفصيل شهري</h4>
                <div className="space-y-2">
                  {report.monthlyBreakdown.map((m, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 text-xs border border-slate-100">
                      <span className="font-bold text-slate-700">{m.month}</span>
                      <div className="flex gap-3 text-slate-500">
                        <span>👥 {m.users}</span>
                        <span>👨‍⚕️ {m.doctors}</span>
                        <span>📅 {m.appointments}</span>
                        <span>💰 {m.revenue} {getCurrency()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== CONVERSATIONS ===== */}
          {tab === "conversations" && !selectedConv && !selectedUserConvs && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">💬 {t("admin.conversations")}</h3>
                <button onClick={() => setGroupedView(!groupedView)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-600">
                  {groupedView ? t("admin.viewAll") : t("admin.groupedBy")}
                </button>
              </div>
              {!groupedView && (
                <div className="flex flex-wrap gap-3 items-end mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                    <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={convFrom} onChange={e => setConvFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                    <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={convTo} onChange={e => setConvTo(e.target.value)} />
                  </div>
                  <button onClick={() => { setConvFrom(""); setConvTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
                </div>
              )}
              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : groupedView ? (
                <div className="space-y-2">
                  {userGroups.map((g) => (
                    <button key={g.user_id} onClick={() => handleOpenUserConversations(g.user_id, g)}
                      className="w-full text-right rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-100 transition text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{g.user_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(g.last_message_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{g.email}</p>
                      <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>{g.conversation_count} {t("admin.conversations")}</span>
                        {g.last_title && <><span>•</span><span className="truncate">{g.last_title}</span></>}
                      </p>
                    </button>
                  ))}
                  {userGroups.length === 0 && <p className="text-center text-slate-400 py-8">{t("admin.noConversations")}</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {convs.map((c) => (
                      <button key={c.id} onClick={() => handleOpenConv(c.id)}
                        className="w-full text-right rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-100 transition text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{c.user_name}</span>
                          <span className="text-[10px] text-slate-400">{new Date(c.updated_at).toLocaleDateString("ar-SA")}</span>
                        </div>
                        <p className="text-slate-500 mt-1 truncate">{c.title}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{c.user_email}</p>
                      </button>
                    ))}
                  </div>
                  {convTotal > 20 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <button disabled={convPage <= 1} onClick={() => setConvPage((p) => p - 1)} className="btn-secondary text-xs px-4 py-2">{t("common.previous")}</button>
                      <span className="text-xs text-slate-500 self-center">صفحة {convPage}</span>
                      <button disabled={convPage * 20 >= convTotal} onClick={() => setConvPage((p) => p + 1)} className="btn-secondary text-xs px-4 py-2">{t("common.next")}</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* User conversations list */}
          {tab === "conversations" && selectedUserConvs && !selectedConv && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">💬 {t("admin.conversations")} {selectedUserInfo?.user_name}</h3>
                <button onClick={() => setSelectedUserConvs(null)} className="btn-secondary text-xs px-4 py-2">{t("common.back")}</button>
              </div>
              {selectedUserInfo && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs mb-4 border border-slate-100">
                  <p><span className="font-semibold">{t("admin.adminEmail")}:</span> {selectedUserInfo.email}</p>
                  {selectedUserInfo.user_phone && <p><span className="font-semibold">{t("profile.phone")}:</span> {selectedUserInfo.user_phone}</p>}
                  <p><span className="font-semibold">{t("admin.conversationCount")}:</span> {selectedUserInfo.conversation_count}</p>
                </div>
              )}
              <div className="space-y-2">
                {selectedUserConvs.map((c) => (
                  <button key={c.id} onClick={() => handleOpenConv(c.id)}
                    className="w-full text-right rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-100 transition text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{c.title}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.updated_at).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{c.messages_count} {t("admin.conversations")}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single conversation detail */}
          {tab === "conversations" && selectedConv && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">💬 {selectedConv.user_name}</h3>
                <button onClick={() => setSelectedConv(null)} className="btn-secondary text-xs px-4 py-2">{t("common.back")}</button>
              </div>
              <p className="text-xs text-slate-400 mb-2">{selectedConv.title}</p>
              {selectedConv.user_phone && <p className="text-xs text-slate-500 mb-4">📞 {selectedConv.user_phone}</p>}
              <p className="text-xs text-slate-400 mb-4">{new Date(selectedConv.updated_at).toLocaleString("ar-SA")}</p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {selectedConv.messages?.map((m: any) => (
                  <div key={m.id} className={`rounded-xl p-3 text-sm max-w-[85%] ${m.role === "user" ? "bg-primary-50 mr-auto" : "bg-slate-100 ml-auto"}`}>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{m.role === "user" ? "🧑" : "🤖"}</p>
                    <p className="text-slate-800 whitespace-pre-wrap">{m.content}</p>
                    {m.attachments && <p className="text-[10px] text-primary-600 mt-1">📎 مرفقات</p>}
                    <p className="text-[9px] text-slate-400 mt-1">{new Date(m.created_at).toLocaleString("ar-SA")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== DOCTORS ===== */}
          {tab === "doctors" && !editDoctor && !doctorDetail && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">👨‍⚕️ {t("admin.doctors")} ({doctors.length})</h3>
                <div className="flex gap-2">
                  <label className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-100 cursor-pointer">
                    📥 {t("admin.importDoctors")}
                    <input type="file" accept=".csv,.tsv,.txt" onChange={handleImportDoctors} className="hidden" />
                  </label>
                  <button onClick={handleExportDoctors}
                    className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-sky-100">
                    📤 {t("admin.exportDoctors")}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-end mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">بحث</label>
                  <input type="text" placeholder="ابحث بالاسم أو التخصص..." className="input-field w-full text-xs py-2 px-3 rounded-xl" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">الحالة</label>
                  <select className="input-field text-xs py-2 px-3 rounded-xl" value={docVerified} onChange={e => setDocVerified(e.target.value)}>
                    <option value="">الكل</option>
                    <option value="verified">موثوق</option>
                    <option value="unverified">غير موثوق</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={docFrom} onChange={e => setDocFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={docTo} onChange={e => setDocTo(e.target.value)} />
                </div>
                <button onClick={() => { setDocSearch(""); setDocVerified(""); setDocFrom(""); setDocTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : (
                <div className="space-y-2">
                  {doctors.map((d) => (
                    <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between">
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <p className="text-slate-500">{d.specialty} — {d.hospital} — {d.city}</p>
                        <p className="text-slate-400 mt-0.5">{d.email} | {d.consultationFee} {getCurrency()} | {d.isVerified ? `✅ ${t("admin.verified")}` : `⏳ ${t("admin.notVerified")}`}</p>
                        {d.licenseNumber && <p className="text-slate-400 mt-0.5 text-[10px]">🪪 {t("admin.license")}: {d.licenseNumber}</p>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleViewDoctorDetail(d.id)}
                          className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-sky-100">{t("admin.details")}</button>
                        <button onClick={() => { setEditDoctor(d); setEditForm({ name: d.name, specialty: d.specialty, hospital: d.hospital, city: d.city, area: d.area, consultationFee: d.consultationFee, isVerified: d.isVerified, acceptedInsurances: d.acceptedInsurances, licenseNumber: d.licenseNumber, phone: d.phone, bio: d.bio, email: d.email }); }}
                          className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary-100">{t("common.edit")}</button>
                        <button onClick={() => { setSubAssignDoctor(d.id); setSubAssignPlan(""); setSubAssignEnd(""); }}
                          className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-100">{t("admin.subscription")}</button>
                        <button onClick={() => { setPwdTarget({ type: "doctor", id: d.id, name: d.name }); setPwdValue(""); }}
                          className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-100">🔑</button>
                        <button onClick={() => handleDeleteDoctor(d.id)}
                          className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-100">{t("common.delete")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Doctor Detail Modal */}
          {tab === "doctors" && doctorDetail && !editDoctor && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">📋 {t("admin.details")} {doctorDetail.name}</h3>
                <button onClick={() => setDoctorDetail(null)} className="btn-secondary text-xs px-4 py-2">{t("common.back")}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-bold text-slate-700 mb-2">{t("doctor.contactInfo")}</p>
                  <p><span className="text-slate-500">{t("doctorLogin.name")}:</span> {doctorDetail.name}</p>
                  <p><span className="text-slate-500">{t("doctor.email")}:</span> {doctorDetail.email}</p>
                  <p><span className="text-slate-500">{t("profile.phone")}:</span> {doctorDetail.phone || "—"}</p>
                  <p><span className="text-slate-500">{t("doctorLogin.specialty")}:</span> {doctorDetail.specialty}</p>
                  <p><span className="text-slate-500">{t("doctorLogin.hospital")}:</span> {doctorDetail.hospital}</p>
                  <p><span className="text-slate-500">{t("doctorLogin.city")}:</span> {doctorDetail.city}</p>
                  <p><span className="text-slate-500">المنطقة:</span> {doctorDetail.area || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-bold text-slate-700 mb-2">{t("doctor.license")}</p>
                  <p><span className="text-slate-500">{t("admin.license")}:</span> {doctorDetail.licenseNumber || "—"}</p>
                  <p><span className="text-slate-500">{t("admin.verified")}:</span> {doctorDetail.isVerified ? "✅" : "❌"}</p>
                  {doctorDetail.idCardPath && <p><span className="text-slate-500">{t("doctorLogin.idCard")}:</span> 📎 {t("common.yes")}</p>}
                  {doctorDetail.licenseDocPath && <p><span className="text-slate-500">{t("doctorLogin.license")}:</span> 📎 {t("common.yes")}</p>}
                  <p className="mt-2 font-bold text-slate-700 mb-1">{t("doctors.insurance")}</p>
                  {doctorDetail.acceptedInsurances?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {doctorDetail.acceptedInsurances.map((ins: string) => (
                        <span key={ins} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">{ins}</span>
                      ))}
                    </div>
                  ) : <p className="text-slate-400">{t("common.noData")}</p>}
                </div>
                <div className="bg-slate-50 rounded-xl p-3 md:col-span-2">
                  <p className="font-bold text-slate-700 mb-2">{t("doctor.notes")}</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{doctorDetail.bio || "—"}</p>
                </div>
                {doctorDetail.subscription && (
                  <div className="bg-amber-50 rounded-xl p-3 md:col-span-2 border border-amber-200">
                    <p className="font-bold text-amber-800 mb-2">⭐ {t("admin.subscription")}</p>
                    <p><span className="text-amber-600">{t("admin.subscriptions")}:</span> {doctorDetail.subscription.plan_name}</p>
                    <p><span className="text-amber-600">{t("doctor.trial")}:</span> {doctorDetail.subscription.is_trial ? `🎁 ${t("common.yes")}` : `❌ ${t("common.no")}`}</p>
                    <p><span className="text-amber-600">نشط:</span> {doctorDetail.subscription.active ? "✅" : "❌"}</p>
                    <p><span className="text-amber-600">من:</span> {new Date(doctorDetail.subscription.start_date).toLocaleDateString("ar-SA")}</p>
                    <p><span className="text-amber-600">إلى:</span> {new Date(doctorDetail.subscription.end_date).toLocaleDateString("ar-SA")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Doctor Form */}
          {tab === "doctors" && editDoctor && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">✏️ {t("admin.editDoctor")}: {editDoctor.name}</h3>
                <button onClick={() => setEditDoctor(null)} className="btn-secondary text-xs px-4 py-2">{t("common.cancel")}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[{key:"name", label:t("doctorLogin.name")},{key:"specialty", label:t("doctorLogin.specialty")},{key:"hospital", label:t("doctorLogin.hospital")},{key:"city", label:t("doctorLogin.city")},{key:"area", label:"area"},{key:"licenseNumber", label:t("admin.license")}].map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block font-medium text-slate-700">{f.label}</label>
                    <input className="input-field w-full" value={editForm[f.key] || ""} onChange={(e) => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("profile.phone")}</label>
                  <input className="input-field w-full" value={editForm.phone || ""} onChange={(e) => setEditForm((prev: any) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("doctor.email")}</label>
                  <input type="email" className="input-field w-full" value={editForm.email || ""} onChange={(e) => setEditForm((prev: any) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("doctors.fee")}</label>
                  <input type="number" className="input-field w-full" value={editForm.consultationFee || ""} onChange={(e) => setEditForm((prev: any) => ({ ...prev, consultationFee: parseFloat(e.target.value) }))} />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <input type="checkbox" id="isVerified" checked={editForm.isVerified || false} onChange={(e) => setEditForm((prev: any) => ({ ...prev, isVerified: e.target.checked }))} />
                  <label htmlFor="isVerified" className="font-medium text-slate-700">{t("admin.verified")}</label>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block font-medium text-slate-700">{t("doctors.insurance")}</label>
                  <input className="input-field w-full" value={(editForm.acceptedInsurances || []).join(", ")} onChange={(e) => setEditForm((prev: any) => ({ ...prev, acceptedInsurances: e.target.value.split(", ").filter(Boolean) }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block font-medium text-slate-700">{t("doctor.notes")}</label>
                  <textarea className="input-field w-full" rows={3} value={editForm.bio || ""} onChange={(e) => setEditForm((prev: any) => ({ ...prev, bio: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSaveDoctor} disabled={loading} className="btn-primary w-full mt-6 py-3 text-xs">💾 {t("common.save")}</button>
            </div>
          )}

          {/* Assign Subscription Modal */}
          {tab === "doctors" && subAssignDoctor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-xs">
                <h3 className="font-bold text-slate-900 mb-4">⭐ {t("admin.assignSubscription")}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">{t("admin.subscriptions")}</label>
                    <select className="input-field w-full" value={subAssignPlan} onChange={(e) => setSubAssignPlan(e.target.value)}>
                      <option value="">{t("common.all")}</option>
                      {subscriptionPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">{t("common.optional")}</label>
                    <input type="date" className="input-field w-full" value={subAssignEnd} onChange={(e) => setSubAssignEnd(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAssignSubscription} disabled={loading || !subAssignPlan} className="btn-primary flex-1 py-2.5 text-xs">{t("common.save")}</button>
                  <button onClick={() => setSubAssignDoctor(null)} className="btn-secondary flex-1 py-2.5 text-xs">{t("common.cancel")}</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== PATIENTS ===== */}
          {tab === "patients" && !patientDetail && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">👥 {t("admin.patients")} ({patients.length})</h3>
              <div className="flex flex-wrap gap-3 items-end mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">بحث</label>
                  <input type="text" placeholder="ابحث بالاسم أو البريد..." className="input-field w-full text-xs py-2 px-3 rounded-xl" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={patientFrom} onChange={e => setPatientFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={patientTo} onChange={e => setPatientTo(e.target.value)} />
                </div>
                <button onClick={() => { setPatientSearch(""); setPatientFrom(""); setPatientTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-right">{t("admin.adminName")}</th><th className="py-2 px-3 text-right">{t("admin.adminEmail")}</th><th className="py-2 px-3 text-right">{t("profile.phone")}</th><th className="py-2 px-3 text-right">التاريخ</th><th className="py-2 px-3 text-right"></th>
                    </tr></thead>
                    <tbody>
                      {patients.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="py-2 px-3 text-slate-500">{p.email}</td>
                          <td className="py-2 px-3 text-slate-500">{p.phone || "—"}</td>
                          <td className="py-2 px-3 text-slate-400">{new Date(p.created_at).toLocaleDateString("ar-SA")}</td>
                          <td className="py-2 px-3">
                            <button onClick={() => handleViewPatient(p.id)}
                              className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-xl text-[10px] font-semibold hover:bg-sky-100">{t("admin.details")}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {patients.length === 0 && !loading && <p className="text-center text-slate-400 py-8">{t("admin.noPatients")}</p>}
            </div>
          )}

          {/* Patient Detail */}
          {tab === "patients" && patientDetail && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">📋 {t("admin.patients")}: {patientDetail.name}</h3>
                <button onClick={() => setPatientDetail(null)} className="btn-secondary text-xs px-4 py-2">{t("common.back")}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-bold text-slate-700 mb-2">{t("doctor.contactInfo")}</p>
                  <p><span className="text-slate-500">{t("admin.adminName")}:</span> {patientDetail.name}</p>
                  <p><span className="text-slate-500">{t("admin.adminEmail")}:</span> {patientDetail.email}</p>
                  <p><span className="text-slate-500">{t("profile.phone")}:</span> {patientDetail.phone || "—"}</p>
                  {patientDetail.date_of_birth && <p><span className="text-slate-500">{t("profile.dob")}:</span> {patientDetail.date_of_birth}</p>}
                  {patientDetail.gender && <p><span className="text-slate-500">{t("profile.gender")}:</span> {patientDetail.gender}</p>}
                  <p><span className="text-slate-500">التاريخ:</span> {new Date(patientDetail.created_at).toLocaleDateString("ar-SA")}</p>
                  <button onClick={() => { setPwdTarget({ type: "patient", id: patientDetail.id, name: patientDetail.name }); setPwdValue(""); }}
                    className="mt-3 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-100">🔑 {t("admin.changePassword")}</button>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-bold text-slate-700 mb-2">{t("admin.dashboard")}</p>
                  <p><span className="text-slate-500">{t("admin.conversations")}:</span> {patientDetail.conversations?.length || 0}</p>
                  <p><span className="text-slate-500">{t("admin.appointments")}:</span> {patientDetail.appointments?.length || 0}</p>
                </div>
              </div>
              {patientDetail.conversations?.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-slate-700 text-xs mb-2">💬 {t("admin.conversations")}</p>
                  <div className="space-y-1.5">
                    {patientDetail.conversations.map((c: any) => (
                      <button key={c.id} onClick={() => { setTab("conversations"); handleOpenConv(c.id); }}
                        className="w-full text-right rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{c.title}</span>
                        <span className="text-slate-400 mr-2">{c.messages_count} {t("admin.conversations")}</span>
                        <span className="text-slate-400 mr-2">{new Date(c.updated_at).toLocaleDateString("ar-SA")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {patientDetail.appointments?.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-slate-700 text-xs mb-2">📅 {t("admin.appointments")}</p>
                  <div className="space-y-1.5">
                    {patientDetail.appointments.map((a: any) => (
                      <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs">
                        <span className="font-bold text-slate-800">{a.doctor_name}</span>
                        <span className="text-slate-500 mr-2">{new Date(a.slot).toLocaleString("ar-SA")} — {a.fee} {getCurrency()}</span>
                        <span className={`rounded-full px-2 py-0.5 font-bold border text-[10px] mr-2 ${
                          a.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          a.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          a.status === "completed" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>{getStatusLabel(a.status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== APPOINTMENTS ===== */}
          {tab === "appointments" && !editAppt && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">📅 {t("admin.appointments")}</h3>
              </div>
              <div className="flex flex-wrap gap-3 items-end mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">الحالة</label>
                  <select className="input-field text-xs py-2 px-3 rounded-xl" value={apptStatus} onChange={e => setApptStatus(e.target.value)}>
                    <option value="">{t("common.all")}</option><option value="pending">{t("status.pending")}</option><option value="approved">{t("status.approved")}</option><option value="completed">{t("status.completed")}</option><option value="rejected">{t("status.rejected")}</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">بحث</label>
                  <input type="text" placeholder="ابحث باسم المريض أو الطبيب..." className="input-field w-full text-xs py-2 px-3 rounded-xl" value={apptSearch} onChange={e => setApptSearch(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={apptFrom} onChange={e => setApptFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={apptTo} onChange={e => setApptTo(e.target.value)} />
                </div>
                <button onClick={() => { setApptStatus(""); setApptSearch(""); setApptFrom(""); setApptTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : (
                <div className="space-y-2">
                  {appts.map((a) => (
                    <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{a.patient_name} → {a.doctor_name}</p>
                          <p className="text-slate-500 mt-0.5">{a.specialty} — {a.hospital}</p>
                          <p className="text-slate-400 mt-0.5">{new Date(a.slot).toLocaleString("ar-SA")} | {a.fee} {getCurrency()}</p>
                          {a.user_phone && <p className="text-slate-400 mt-0.5 text-[10px]">📞 {a.user_phone}</p>}
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 font-bold border text-[10px] ${
                          a.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          a.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          a.status === "completed" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>{getStatusLabel(a.status)}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {a.status === "pending" && <button onClick={() => handleApptStatus(a.id, "approved")} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-[10px] font-semibold hover:bg-emerald-100">{t("doctor.accept")}</button>}
                        {a.status === "pending" && <button onClick={() => handleApptStatus(a.id, "rejected")} className="bg-rose-50 text-rose-600 px-3 py-1 rounded-xl text-[10px] font-semibold hover:bg-rose-100">{t("doctor.reject")}</button>}
                        {a.status === "approved" && <button onClick={() => handleApptStatus(a.id, "completed")} className="bg-sky-50 text-sky-700 px-3 py-1 rounded-xl text-[10px] font-semibold hover:bg-sky-100">{t("status.completed")}</button>}
                        <button onClick={() => { setEditAppt(a); setEditApptForm({ slot: a.slot, doctorName: a.doctor_name, patientName: a.patient_name, phone: a.user_phone || "", fee: a.fee }); }}
                          className="bg-primary-50 text-primary-700 px-3 py-1 rounded-xl text-[10px] font-semibold hover:bg-primary-100">{t("common.edit")}</button>
                      </div>
                    </div>
                  ))}
                  {appts.length === 0 && <p className="text-center text-slate-400 py-8">{t("admin.noAppointments")}</p>}
                </div>
              )}
            </div>
          )}

          {/* Edit Appointment */}
          {tab === "appointments" && editAppt && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">✏️ {t("admin.appointments")}</h3>
                <button onClick={() => setEditAppt(null)} className="btn-secondary text-xs px-4 py-2">{t("common.cancel")}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("booking.patientName")}</label>
                  <input className="input-field w-full" value={editApptForm.patientName || ""} onChange={(e) => setEditApptForm((prev: any) => ({ ...prev, patientName: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("booking.doctor")}</label>
                  <input className="input-field w-full" value={editApptForm.doctorName || ""} onChange={(e) => setEditApptForm((prev: any) => ({ ...prev, doctorName: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("profile.phone")}</label>
                  <input className="input-field w-full" value={editApptForm.phone || ""} onChange={(e) => setEditApptForm((prev: any) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">الموعد</label>
                  <input type="datetime-local" className="input-field w-full" value={editApptForm.slot?.replace(" ", "T").slice(0, 16) || ""} onChange={(e) => setEditApptForm((prev: any) => ({ ...prev, slot: e.target.value.replace("T", " ") }))} />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">{t("doctors.fee")}</label>
                  <input type="number" className="input-field w-full" value={editApptForm.fee || ""} onChange={(e) => setEditApptForm((prev: any) => ({ ...prev, fee: parseInt(e.target.value) }))} />
                </div>
              </div>
              <button onClick={handleApptUpdate} disabled={loading} className="btn-primary w-full mt-6 py-3 text-xs">💾 {t("common.save")}</button>
            </div>
          )}

          {/* ===== SUBSCRIPTIONS ===== */}
          {tab === "subscriptions" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">⭐ {t("admin.subscriptions")} ({subscriptions.length})</h3>
              <div className="flex flex-wrap gap-3 items-end mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">الحالة</label>
                  <select className="input-field text-xs py-2 px-3 rounded-xl" value={subActive} onChange={e => setSubActive(e.target.value)}>
                    <option value="">الكل</option>
                    <option value="1">نشط</option>
                    <option value="0">منتهي</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={subFrom} onChange={e => setSubFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ</label>
                  <input type="date" className="input-field text-xs py-2 px-3 rounded-xl" value={subTo} onChange={e => setSubTo(e.target.value)} />
                </div>
                <button onClick={() => { setSubActive(""); setSubFrom(""); setSubTo(""); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition">مسح الفلتر</button>
              </div>
              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-right">{t("admin.doctors")}</th><th className="py-2 px-3 text-right">{t("admin.adminEmail")}</th><th className="py-2 px-3 text-right">{t("admin.subscriptions")}</th><th className="py-2 px-3 text-right">الحالة</th><th className="py-2 px-3 text-right">{t("doctor.trial")}</th><th className="py-2 px-3 text-right">البداية</th><th className="py-2 px-3 text-right">النهاية</th>
                    </tr></thead>
                    <tbody>
                      {subscriptions.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{s.doctor_name}</td>
                          <td className="py-2 px-3 text-slate-500 text-[10px]">{s.doctor_email}</td>
                          <td className="py-2 px-3">{s.plan_name}</td>
                          <td className="py-2 px-3">{s.active === 1 ? "✅ نشط" : "⏹️ منتهي"}</td>
                          <td className="py-2 px-3">{s.is_trial === 1 ? "🎁" : "—"}</td>
                          <td className="py-2 px-3 text-slate-400">{new Date(s.start_date).toLocaleDateString("ar-SA")}</td>
                          <td className="py-2 px-3 text-slate-400">{new Date(s.end_date).toLocaleDateString("ar-SA")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ===== ADMINS ===== */}
          {tab === "admins" && (
            <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">🔐 {t("admin.admins")} ({admins.length})</h3>
                <button onClick={() => setShowNewAdminForm(!showNewAdminForm)}
                  className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-100">
                  {showNewAdminForm ? `❌ ${t("common.cancel")}` : `➕ ${t("admin.addAdmin")}`}
                </button>
              </div>

              {showNewAdminForm && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4 text-xs space-y-3">
                  <h4 className="font-bold text-slate-700">{t("admin.addAdmin")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">{t("admin.adminName")}</label>
                      <input className="input-field w-full" value={newAdmin.name} onChange={(e) => setNewAdmin((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">{t("admin.adminEmail")}</label>
                      <input className="input-field w-full" type="email" value={newAdmin.email} onChange={(e) => setNewAdmin((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">{t("admin.adminPassword")}</label>
                      <input className="input-field w-full" type="password" value={newAdmin.password} onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))} />
                    </div>
                  </div>
                  <button onClick={handleCreateAdmin} disabled={loading || !newAdmin.name || !newAdmin.email || !newAdmin.password}
                    className="btn-primary text-xs px-6 py-2">{t("common.confirm")}</button>
                </div>
              )}

              {loading ? <p className="text-center text-slate-400 py-8">{t("common.loading")}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-right">{t("admin.adminName")}</th><th className="py-2 px-3 text-right">{t("admin.adminEmail")}</th><th className="py-2 px-3 text-right">{t("admin.adminRole")}</th><th className="py-2 px-3 text-right">التاريخ</th><th className="py-2 px-3 text-right"></th>
                    </tr></thead>
                    <tbody>
                      {admins.map((a) => (
                        <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{a.name}</td>
                          <td className="py-2 px-3 text-slate-500">{a.email}</td>
                          <td className="py-2 px-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              a.role === "super_admin" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                            }`}>{a.role === "super_admin" ? t("admin.roleSuper") : t("admin.roleAdmin")}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">{new Date(a.created_at).toLocaleDateString("ar-SA")}</td>
                          <td className="py-2 px-3">
                            <button onClick={() => { setPwdTarget({ type: "admin", id: a.id, name: a.name }); setPwdValue(""); }}
                              className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl text-[10px] font-semibold hover:bg-amber-100 ml-1">🔑</button>
                            <button onClick={() => handleDeleteAdmin(a.id)}
                              className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl text-[10px] font-semibold hover:bg-rose-100">{t("common.delete")}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {admins.length === 0 && !loading && <p className="text-center text-slate-400 py-8">{t("admin.noAdmins")}</p>}
            </div>
          )}

        </div>
      </div>

      {/* Password Change Modal */}
      {pwdTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-xs">
            <h3 className="font-bold text-slate-900 mb-1">🔑 {t("admin.passwordChangeTitle")}</h3>
            <p className="text-slate-500 mb-4">{t("admin.adminName")}: {pwdTarget.name}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-medium text-slate-700">{t("admin.newPassword")}</label>
                <input type="password" className="input-field w-full" value={pwdValue}
                  onChange={(e) => setPwdValue(e.target.value)}
                  placeholder={t("admin.newPassword")} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleChangePassword} disabled={loading || pwdValue.length < 4}
                className="btn-primary flex-1 py-2.5 text-xs">{t("common.save")}</button>
              <button onClick={() => { setPwdTarget(null); setPwdValue(""); }}
                className="btn-secondary flex-1 py-2.5 text-xs">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
