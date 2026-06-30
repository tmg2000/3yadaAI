import { useState, type FormEvent } from "react";
import type { Doctor } from "../types";
import { formatSlot, getCurrency } from "../utils";
import { useI18n } from "../i18n";

type BookingScreenProps = {
  doctor: Doctor;
  loading: boolean;
  onSubmit: (data: {
    patientName: string;
    phone: string;
    slot: string;
  }) => void;
  onBack: () => void;
};

export function BookingScreen({
  doctor,
  loading,
  onSubmit,
  onBack,
}: BookingScreenProps) {
  const { t } = useI18n();
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState(doctor.availableSlots[0] ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !slot) return;
    onSubmit({ patientName: patientName.trim(), phone: phone.trim(), slot });
  };

  return (
    <section className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t("booking.title")}</h2>
        <button type="button" className="btn-secondary py-2 px-4 text-sm" onClick={onBack}>
          {t("common.back")}
        </button>
      </div>

      <div className="card bg-primary-50/50">
        <p className="font-bold text-slate-900">{doctor.name}</p>
        <p className="text-sm text-primary-700">{doctor.specialty}</p>
        <p className="text-sm text-muted">
          {doctor.hospital}{doctor.area ? ` — ${doctor.area}` : ""}{doctor.city ? ` — ${doctor.city}` : ""}
        </p>
        {doctor.licenseNumber && (
          <p className="text-xs text-slate-500 mt-1">{t("admin.license")}: {doctor.licenseNumber}</p>
        )}
        <p className="mt-2 text-sm font-medium">
          {t("doctors.fee")}: {doctor.consultationFee} {getCurrency(doctor.city)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="patientName" className="mb-1 block text-sm font-medium">
            {t("booking.patientName")} <span className="text-red-500">*</span>
          </label>
          <input
            id="patientName"
            type="text"
            className="input-field"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder={t("booking.patientNamePlaceholder")}
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            {t("booking.phone")}
          </label>
          <input
            id="phone"
            type="tel"
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("booking.phonePlaceholder")}
            dir="ltr"
            autoComplete="tel"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("booking.selectSlot")}</legend>
          <p className="mb-2 text-xs text-slate-500">{t("booking.slotWindowHint")}</p>
          {doctor.availableSlots.length === 0 ? (
            <p className="text-sm text-red-500 text-center py-4">
              {t("booking.noSlots")}
            </p>
          ) : (
            <div className="space-y-2">
              {doctor.availableSlots.map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    slot === s
                      ? "border-primary-500 bg-primary-50"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={s}
                    checked={slot === s}
                    onChange={() => setSlot(s)}
                    className="text-primary-600"
                  />
                  <span className="text-sm">{formatSlot(s)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || !patientName.trim() || !slot || doctor.availableSlots.length === 0}
        >
          {loading
            ? t("booking.submitting")
            : doctor.availableSlots.length === 0
            ? t("booking.noSlots")
            : t("booking.submit")}
        </button>
      </form>
    </section>
  );
}
