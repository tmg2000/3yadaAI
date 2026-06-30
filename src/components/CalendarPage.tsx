import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import type { Appointment } from "../types";
import { fetchAppointments, requestAppointmentModification } from "../api";
import { formatSlot, getStatusLabel, getCurrency } from "../utils";

type CalendarPageProps = {
  onBack: () => void;
};

export function CalendarPage({ onBack }: CalendarPageProps) {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifyTarget, setModifyTarget] = useState<Appointment | null>(null);
  const [modifySlot, setModifySlot] = useState("");
  const [modifyPhone, setModifyPhone] = useState("");
  const [modifyName, setModifyName] = useState("");

  const load = () => {
    setLoading(true);
    fetchAppointments()
      .then(setAppointments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRequestModify = async () => {
    if (!modifyTarget) return;
    setLoading(true);
    try {
      await requestAppointmentModification(modifyTarget.id, {
        slot: modifySlot || undefined,
        patientName: modifyName || undefined,
        phone: modifyPhone || undefined,
      });
      setModifyTarget(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      completed: "bg-sky-50 text-sky-700 border-sky-200",
      rejected: "bg-rose-50 text-rose-700 border-rose-200",
      modification_requested: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return (
      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${map[status] || "bg-slate-50 text-slate-600"}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  return (
    <section className="animate-fade-in-up max-w-2xl mx-auto my-4">
      <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{t("calendar.title")}</h2>
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline">← {t("common.back")}</button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <p className="text-center text-slate-500 py-8">{t("common.loading")}</p>
        ) : appointments.length === 0 ? (
          <p className="text-center text-slate-500 py-8">{t("calendar.noAppointments")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{apt.doctor_name}</p>
                    <p className="text-sm text-primary-600">{apt.specialty}</p>
                  </div>
                  {statusBadge(apt.status || "pending")}
                </div>
                <div className="mt-2 text-sm text-slate-600">{apt.hospital}{apt.city ? ` — ${apt.city}` : ""}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <span>🕒 {formatSlot(apt.slot)}</span>
                  <span>👤 {apt.patient_name}</span>
                  <span>💰 {apt.fee} {getCurrency()}</span>
                  {apt.phone && <span>📞 {apt.phone}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {apt.googleMapLink && (
                    <a href={apt.googleMapLink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition">
                      {t("calendar.viewMap")}
                    </a>
                  )}
                  <button onClick={() => { setModifyTarget(apt); setModifySlot(apt.slot); setModifyName(apt.patient_name); setModifyPhone(apt.phone || ""); }}
                    className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition">
                    {t("calendar.modify")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-slate-900">{t("calendar.modifyTitle")}</h3>
            <p className="text-slate-500">{t("booking.doctor")}: {modifyTarget.doctor_name}</p>
            <div>
              <label className="mb-1 block font-medium text-slate-700">{t("calendar.modifySlot")}</label>
              <input type="datetime-local" className="input-field w-full" value={modifySlot.replace(" ", "T").slice(0, 16)} onChange={(e) => setModifySlot(e.target.value.replace("T", " "))} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">{t("calendar.modifyName")}</label>
              <input className="input-field w-full" value={modifyName} onChange={(e) => setModifyName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">{t("calendar.modifyPhone")}</label>
              <input className="input-field w-full" dir="ltr" value={modifyPhone} onChange={(e) => setModifyPhone(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleRequestModify} disabled={loading} className="btn-primary flex-1 py-2.5 text-xs">{t("calendar.modifySubmit")}</button>
              <button onClick={() => setModifyTarget(null)} className="btn-secondary flex-1 py-2.5 text-xs">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
