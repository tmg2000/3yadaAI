import type { Doctor } from "../types";
import { getCurrency } from "../utils";
import { useI18n } from "../i18n";

type DoctorsScreenProps = {
  doctors: Doctor[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (doctor: Doctor) => void;
  onBack: () => void;
  onBackToChat?: () => void;
};

export function DoctorsScreen({
  doctors,
  loading,
  selectedId,
  onSelect,
  onBack,
  onBackToChat,
}: DoctorsScreenProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-muted">{t("doctors.searching")}</p>
      </div>
    );
  }
  const availableDoctors = doctors.filter(d => d.availableSlots.length > 0);

  if (doctors.length === 0 || availableDoctors.length === 0) {
    return (
      <section className="animate-fade-in-up space-y-4">
        <div className="card text-center py-12">
          <span className="text-6xl">🔍</span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">{t("doctors.noDoctors")}</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            لم نتمكن من العثور على أطباء بالتخصص المطلوب (ومعايير المنطقة أو التأمين إن وُجدت).
            يمكنك العودة للاستشارة لتقديم معلومات أكثر دقة أو تعديل معايير البحث.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary px-6" onClick={onBackToChat}>
              {t("doctors.backToChat")}
            </button>
            <button type="button" className="btn-secondary px-6" onClick={onBack}>
              {t("doctors.editCriteria")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          👨‍⚕️ أطباء مقترحون
        </h2>
        <button type="button" className="btn-secondary py-2 px-4 text-sm" onClick={onBack}>
          رجوع
        </button>
      </div>

      <p className="text-sm text-muted">
        اختر الطبيب الأنسب لك. القائمة مرتبة حسب تخصصك المطلوب والمنطقة والتأمين الصحي إن وجد.
      </p>

      <ul className="space-y-3">
        {availableDoctors.map((doc, index) => {
          const selected = selectedId === doc.id;
          return (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => onSelect(doc)}
                className={`card w-full text-right transition hover:shadow-md ${
                  selected
                    ? "border-2 border-primary-500 ring-2 ring-primary-500/20"
                    : "hover:border-primary-200"
                }`}
              >
                <div className="flex gap-4">
                  <span className="text-4xl" aria-hidden>
                    {doc.image}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{doc.name}</h3>
                        <p className="text-sm text-primary-700">{doc.specialty}</p>
                      </div>
                      {index < 3 && (
                        <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                          موصى به
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {doc.hospital}{doc.area ? ` — ${doc.area}` : ""}{doc.city ? ` — ${doc.city}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>⭐ {doc.rating}</span>
                      <span>{doc.experienceYears} {t("doctors.yearsExp")}</span>
                      <span>{doc.consultationFee} {getCurrency(doc.city)}</span>
                      <span>{doc.availableSlots.length} مواعيد متاحة</span>
                    </div>
                    {doc.acceptedInsurances && doc.acceptedInsurances.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {doc.acceptedInsurances.slice(0, 3).map((ins) => (
                          <span key={ins} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            {ins}
                          </span>
                        ))}
                        {doc.acceptedInsurances.length > 3 && (
                          <span className="text-xs text-muted">+{doc.acceptedInsurances.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {selected && (
                    <span className="text-primary-600 text-xl" aria-label="محدد">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
