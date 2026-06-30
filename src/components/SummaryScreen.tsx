import type { MedicalSummary } from "../types";
import { urgencyMeta, getSpecialtyLabel } from "../utils";
import { useI18n } from "../i18n";

type SummaryScreenProps = {
  summary: MedicalSummary;
  onContinue: () => void;
};

export function SummaryScreen({ summary, onContinue }: SummaryScreenProps) {
  const urgency = urgencyMeta(summary.urgencyLevel);
  const { t } = useI18n();

  return (
    <section className="animate-fade-in-up space-y-4">
      {summary.urgencyLevel === "emergency" && (
        <div
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-center text-red-900"
          role="alert"
        >
          <p className="text-lg font-bold">{t("summary.emergencyTitle")}</p>
          <p className="mt-1 text-sm">{t("summary.emergencyDesc")}</p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 text-sm text-amber-900 shadow-sm flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <p className="leading-relaxed font-medium">{t("summary.disclaimer")}</p>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">
            {t("summary.doctorBriefTitle")}
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${urgency.className}`}
          >
            {t("summary.urgencyPrefix")}: {urgency.label}
          </span>
        </div>

        <div className="space-y-4 text-sm text-start">
          <div>
            <h3 className="mb-1 font-semibold text-slate-700">{t("summary.patientConcerns")}</h3>
            <p className="leading-relaxed text-slate-600">
              {summary.patientConcerns}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">{t("summary.symptomsTitle")}</h3>
            <ul className="flex flex-wrap gap-2">
              {summary.symptoms.map((s) => (
                <li
                  key={s}
                  className="rounded-lg bg-primary-50 px-3 py-1 text-primary-800"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-xs text-muted">{t("summary.duration")}</span>
              <p className="font-medium">{summary.duration || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-xs text-muted">{t("summary.severity")}</span>
              <p className="font-medium">{summary.severity || "—"}</p>
            </div>
          </div>

          {summary.additionalNotes && (
            <div>
              <h3 className="mb-1 font-semibold text-slate-700">{t("summary.notesTitle")}</h3>
              <p className="text-slate-600">{summary.additionalNotes}</p>
            </div>
          )}

          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
            <h3 className="mb-2 font-semibold text-primary-900">
              {t("summary.doctorBriefBox")}
            </h3>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
              {summary.doctorBrief}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">
              {t("summary.recommendedSpecialties")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {summary.recommendedSpecialties.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                >
                  {getSpecialtyLabel(key)}
                </span>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {summary.preferredCity && (
                <p className="text-sm text-slate-500">📍 {t("summary.searchIn")}: {summary.preferredCity}</p>
              )}
              {summary.preferredInsurance && (
                <p className="text-sm text-slate-500">🛡️ {t("summary.insuranceLabel")}: {summary.preferredInsurance}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary w-full"
        onClick={onContinue}
        disabled={summary.urgencyLevel === "emergency"}
      >
        {summary.urgencyLevel === "emergency"
          ? t("summary.bookingNotAvailable")
          : t("summary.chooseDoctor")}
      </button>
    </section>
  );
}
