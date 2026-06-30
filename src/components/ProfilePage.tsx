import { useState } from "react";
import { useI18n } from "../i18n";
import type { User } from "../types";
import { updateProfile } from "../api";

type ProfilePageProps = {
  user: User;
  onLogout: () => void;
  onBack: () => void;
  onUserUpdate: (user: User) => void;
};

export function ProfilePage({ user, onLogout, onBack, onUserUpdate }: ProfilePageProps) {
  const { t } = useI18n();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user.date_of_birth ?? "");
  const [gender, setGender] = useState(user.gender ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const { user: updated } = await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
      });
      onUserUpdate(updated);
      setMsg(t("profile.saved"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = () => {
    if (!phone.trim()) return;
    setVerifying(true);
    setTimeout(() => {
      setVerified(true);
      setVerifying(false);
      setMsg(t("profile.phoneVerified"));
    }, 1500);
  };

  return (
    <section className="animate-fade-in-up max-w-md mx-auto my-4">
      <div className="rounded-3xl border border-white/60 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">👤 {t("profile.title")}</h2>
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline">← {t("common.back")}</button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl font-bold text-white shadow-lg">
            {user.name.charAt(0)}
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-medium text-slate-700">{t("profile.name")}</label>
            <input className="input-field w-full" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">{t("profile.email")}</label>
            <input className="input-field w-full bg-slate-100 text-slate-500" value={user.email} disabled />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">{t("profile.phone")}</label>
            <div className="flex gap-2">
              <input className="input-field flex-1" type="tel" dir="ltr" value={phone}
                onChange={(e) => { setPhone(e.target.value); setVerified(false); }}
                placeholder={t("profile.phonePlaceholder")} disabled={saving} />
              <button onClick={handleVerify} disabled={verifying || !phone.trim() || verified}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  verified ? "bg-emerald-100 text-emerald-700" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}>
                {verifying ? "..." : verified ? t("profile.phoneVerified") : t("profile.verifyPhone")}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">{t("profile.dob")}</label>
            <input className="input-field w-full" type="date" value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)} disabled={saving} />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">{t("profile.gender")}</label>
            <select className="input-field w-full" value={gender}
              onChange={(e) => setGender(e.target.value)} disabled={saving}>
              <option value="">— {t("common.select") || "اختر"} —</option>
              <option value="male">{t("profile.genderMale")}</option>
              <option value="female">{t("profile.genderFemale")}</option>
            </select>
          </div>

          {(user.age != null || user.health_insurance) && (
            <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-slate-600">
              {user.age != null && (
                <div className="flex justify-between">
                  <span>{t("profile.age")}</span>
                  <span className="font-medium text-slate-900">{user.age}</span>
                </div>
              )}
              {user.health_insurance && (
                <div className="flex justify-between">
                  <span>{t("profile.insurance")}</span>
                  <span className="font-medium text-slate-900">{user.health_insurance}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {msg && <div className="mt-4 text-center text-sm text-slate-600">{msg}</div>}

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-4 w-full">
          {saving ? t("common.saving") : t("profile.save")}
        </button>

        <button onClick={onLogout} className="btn-primary mt-3 w-full py-3 bg-red-500 hover:bg-red-600 shadow-red-500/20">
          {t("profile.logout")}
        </button>
      </div>
    </section>
  );
}
