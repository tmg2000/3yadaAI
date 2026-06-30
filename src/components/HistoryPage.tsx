import { useEffect, useState } from "react";
import { fetchSessions, fetchSession, fetchConversation } from "../api";
import type { Session, ChatMessage, Attachment } from "../types";
import { getStatusLabel, getCurrency } from "../utils";
import { useI18n } from "../i18n";
import { uploadUrl } from "../config";


type HistoryPageProps = {
  onSelectConversation: (id: string) => void;
  onBack: () => void;
};

export function HistoryPage({ onSelectConversation, onBack }: HistoryPageProps) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<Session | null>(null);
  const [selectedConvMessages, setSelectedConvMessages] = useState<ChatMessage[] | null>(null);
  const [selectedConvTitle, setSelectedConvTitle] = useState("");
  const [selectedConvId, setSelectedConvId] = useState("");

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExpandSession = async (id: string) => {
    if (expandedSession === id) {
      setExpandedSession(null);
      setSessionDetail(null);
      return;
    }
    setExpandedSession(id);
    try {
      const detail = await fetchSession(id);
      setSessionDetail(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleViewConversation = async (convId: string, title: string) => {
    try {
      const conv = await fetchConversation(convId);
      setSelectedConvId(convId);
      setSelectedConvTitle(title);
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
      setSelectedConvMessages(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  // Viewing single conversation messages
  if (selectedConvMessages) {
    return (
      <section className="animate-fade-in-up max-w-2xl mx-auto my-4">
        <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">💬 {selectedConvTitle}</h2>
            <button onClick={() => setSelectedConvMessages(null)} className="text-sm text-primary-600 hover:underline">{t("common.back")}</button>
          </div>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            {selectedConvMessages.map((m) => (
              <div key={m.id} className={`rounded-xl p-3 text-sm max-w-[85%] ${m.role === "user" ? "bg-primary-50 mr-auto" : "bg-slate-100 ml-auto"}`}>
                <p className="text-[10px] font-bold text-slate-400 mb-1">{m.role === "user" ? `🧑 ${t("history.you")}` : `🤖 ${t("history.assistant")}`}</p>
                <p className="text-slate-800 whitespace-pre-wrap">{m.content}</p>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      a.type === "image"
                        ? <img key={a.id} src={a.url} alt={a.name} className="w-20 h-20 object-cover rounded-lg border" />
                        : <a key={a.id} href={a.url} target="_blank" className="text-[10px] text-primary-600 underline">📎 {a.name}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => { onSelectConversation(selectedConvId); }} className="btn-primary w-full mt-4 py-2.5 text-xs">{t("history.resumeConversation")}</button>
        </div>
      </section>
    );
  }

  // Main sessions list
  return (
    <section className="animate-fade-in-up max-w-2xl mx-auto my-4">
      <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{t("history.title")}</h2>
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline">{t("common.back")}</button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <p className="text-center text-slate-500 py-8">{t("common.loading")}</p>
        ) : sessions.length === 0 ? (
          <p className="text-center text-slate-500 py-8">{t("history.noSessions")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const summary = s.summary_json ? JSON.parse(s.summary_json) : null;
              const isOpen = expandedSession === s.id;
              return (
                <div key={s.id} className="rounded-xl border border-border bg-white transition hover:shadow-md overflow-hidden">
                  {/* Session header */}
                  <button onClick={() => handleExpandSession(s.id)}
                    className="w-full text-right p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{s.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>{s.status === "completed" ? t("history.statusCompleted") : t("history.statusInProgress")}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(s.updated_at || s.created_at).toLocaleString("ar-SA")}
                        {s.appointment_status && ` • ${s.appointment_status === "pending" ? t("history.appointmentPending") : s.appointment_status === "approved" ? t("history.appointmentApproved") : s.appointment_status === "completed" ? t("history.appointmentCompleted") : t("history.appointmentRejected")}`}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded session detail */}
                  {isOpen && sessionDetail && sessionDetail.id === s.id && (
                    <div className="border-t border-slate-100 p-4 space-y-4">

                      {/* Summary section */}
                      {summary && (
                        <div className="rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-3">
                          <p className="font-bold text-sky-800 text-xs mb-2">{t("history.summary")}</p>
                          <div className="text-xs text-sky-700 space-y-1">
                            <p><span className="font-semibold">{t("history.summaryComplaint")}:</span> {summary.patientConcerns}</p>
                            {summary.symptoms?.length > 0 && <p><span className="font-semibold">{t("history.summarySymptoms")}:</span> {summary.symptoms.join("، ")}</p>}
                            <p><span className="font-semibold">{t("history.summaryDuration")}:</span> {summary.duration}</p>
                            {summary.preferredCity && <p><span className="font-semibold">{t("history.summaryCity")}:</span> {summary.preferredCity}</p>}
                            {summary.preferredInsurance && <p><span className="font-semibold">{t("history.summaryInsurance")}:</span> {summary.preferredInsurance}</p>}
                            <p><span className="font-semibold">{t("history.summarySpecialties")}:</span> {summary.recommendedSpecialties?.join("، ")}</p>
                          </div>
                        </div>
                      )}

                      {/* Conversations section */}
                      {sessionDetail.conversations && sessionDetail.conversations.length > 0 && (
                        <div>
                          <p className="font-bold text-slate-700 text-xs mb-2">{t("history.conversations")} ({sessionDetail.conversations.length})</p>
                          <div className="space-y-1.5">
                            {sessionDetail.conversations.map((c) => (
                              <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50/60 overflow-hidden">
                                <button onClick={() => handleViewConversation(c.id, c.title)}
                                  className="w-full text-right p-2.5 text-xs flex items-center justify-between hover:bg-slate-100 transition">
                                  <div>
                                    <p className="font-semibold text-slate-800">{c.title}</p>
                                    <p className="text-slate-400 text-[10px]">{c.messages_count} {t("history.messages")} • {new Date(c.updated_at).toLocaleDateString("ar-SA")}</p>
                                  </div>
                                  <span className="text-primary-600 text-[10px]">{t("history.viewDetails")}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Appointment section */}
                      {sessionDetail.appointments && sessionDetail.appointments.length > 0 && (
                        <div>
                          <p className="font-bold text-slate-700 text-xs mb-2">{t("history.appointments")}</p>
                          {sessionDetail.appointments.map((a) => (
                            <div key={a.id} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-800">{a.doctor_name}</p>
                                  <p className="text-slate-500">{a.hospital} — {a.city}</p>
                                  <p className="text-slate-400">{new Date(a.slot).toLocaleString("ar-SA")} | {a.fee} {getCurrency()}</p>
                                  <p className="text-slate-400">{t("history.forPatient")}: {a.patient_name}{a.phone ? ` — 📞 ${a.phone}` : ""}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 font-bold border text-[10px] ${
                                  a.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  a.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  a.status === "completed" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>{getStatusLabel(a.status)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!summary && (!sessionDetail.conversations || sessionDetail.conversations.length === 0) && (!sessionDetail.appointments || sessionDetail.appointments.length === 0) && (
                        <p className="text-xs text-slate-400 text-center py-4">{t("history.noDetails")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
