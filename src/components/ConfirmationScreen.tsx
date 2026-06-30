import { useI18n } from "../i18n";
import type { Appointment } from "../types";
import { formatSlot, getCurrency } from "../utils";

type ConfirmationScreenProps = {
  appointment: Appointment;
  onRestart: () => void;
};

export function ConfirmationScreen({
  appointment,
  onRestart,
}: ConfirmationScreenProps) {
  const { t } = useI18n();

  return (
    <section className="animate-fade-in-up text-center">
      <div className="card mx-auto max-w-md">
        <div className="mb-4 text-6xl" aria-hidden>✅</div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900">
          {t("confirmation.title")}
        </h2>

        <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-right text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("confirmation.bookingId")}</dt>
            <dd className="font-mono font-bold text-primary-700" dir="ltr">
              {appointment.id}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("booking.patientName")}</dt>
            <dd className="font-medium">{appointment.patient_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("confirmation.doctorInfo")}</dt>
            <dd className="font-medium">{appointment.doctor_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("confirmation.appointmentDate")}</dt>
            <dd className="font-medium">{formatSlot(appointment.slot)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("doctors.fee")}</dt>
            <dd>{appointment.fee} {getCurrency()}</dd>
          </div>
        </dl>

        <button type="button" className="btn-primary mt-8 w-full" onClick={onRestart}>
          {t("confirmation.restart")}
        </button>
      </div>
    </section>
  );
}
