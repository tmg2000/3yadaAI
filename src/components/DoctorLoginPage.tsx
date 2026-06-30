import { useState, type FormEvent } from "react";
import { doctorLogin, doctorRegister, setDoctorToken } from "../api-doctor";
import { useI18n } from "../i18n";

const specialties = [
  { key: "general" },
  { key: "internal" },
  { key: "pediatrics" },
  { key: "cardiology" },
  { key: "dermatology" },
  { key: "orthopedics" },
  { key: "gynecology" },
  { key: "ent" },
  { key: "psychiatry" },
  { key: "ophthalmology" },
  { key: "dentistry" },
];

type Props = {
  onLogin: (doctor: any) => void;
  onBack: () => void;
};

export function DoctorLoginPage({ onLogin, onBack }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [licenseDocFile, setLicenseDocFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { t } = useI18n();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { doctor, token } = await doctorLogin(email, password);
      setDoctorToken(token);
      onLogin(doctor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!specialty) { setError(t("doctorLogin.selectSpecialty")); return; }
    if (!idCardFile) { setError(t("doctorLogin.uploadIdCard")); return; }
    if (!licenseDocFile) { setError(t("doctorLogin.uploadLicense")); return; }
    setLoading(true);
    setError(null);
    try {
      const sel = specialties.find((s) => s.key === specialty)!;
      const { doctor, token } = await doctorRegister(
        name, email, password, specialty, sel.key, hospital,
        city || undefined, area || undefined, licenseNumber || undefined,
        phone || undefined, bio || undefined,
        idCardFile, licenseDocFile
      );
      setDoctorToken(token);
      onLogin(doctor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="animate-fade-in-up max-w-sm mx-auto my-12">
      <div className="rounded-3xl border border-white/60 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <span className="text-4xl">🩺</span>
          <h2 className="mt-3 text-xl font-bold text-slate-900">{t("doctorLogin.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{mode === "login" ? t("doctorLogin.loginBtn") : t("doctorLogin.registerTitle")}</p>
        </div>

        <div className="flex mb-6 rounded-xl bg-slate-100 p-1">
          <button onClick={() => setMode("login")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>{t("doctorLogin.loginBtn")}</button>
          <button onClick={() => setMode("register")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "register" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>{t("doctorLogin.register")}</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.email")}</label>
              <input className="input-field w-full" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.password")}</label>
              <input className="input-field w-full" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? t("common.loading") : t("doctorLogin.loginBtn")}</button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.name")}</label>
              <input className="input-field w-full" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.specialty")}</label>
              <select className="input-field w-full" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required disabled={loading}>
                <option value="">{t("doctorLogin.selectSpecialtyPlaceholder")}</option>
                {specialties.map((s) => <option key={s.key} value={s.key}>{t(`specialty.${s.key}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.hospital")}</label>
              <input className="input-field w-full" value={hospital} onChange={(e) => setHospital(e.target.value)} required disabled={loading} placeholder={t("doctorLogin.hospitalPlaceholder")} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.city")}</label>
              <input className="input-field w-full" value={city} onChange={(e) => setCity(e.target.value)} disabled={loading} placeholder={t("doctorLogin.cityPlaceholder")} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.area")}</label>
              <input className="input-field w-full" value={area} onChange={(e) => setArea(e.target.value)} disabled={loading} placeholder={t("doctorLogin.areaPlaceholder")} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.license")}</label>
              <input className="input-field w-full" dir="ltr" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} disabled={loading} placeholder={t("doctorLogin.licensePlaceholder")} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.email")}</label>
              <input className="input-field w-full" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.password")}</label>
              <input className="input-field w-full" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={loading} autoComplete="new-password" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.phone")}</label>
              <input className="input-field w-full" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t("doctorLogin.bio")}</label>
              <textarea className="input-field w-full min-h-[60px]" value={bio} onChange={(e) => setBio(e.target.value)} disabled={loading} />
            </div>

            {/* Document Upload Fields */}
            <div className="border-t border-dashed border-slate-300 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-slate-800">{t("doctorLogin.requiredDocs")}</h4>
              
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{t("doctorLogin.idCardLabel")}</label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                  <input type="file" accept="image/*,.pdf" required onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} disabled={loading} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <div className="text-center">
                    <span className="text-2xl">🪪</span>
                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      {idCardFile ? idCardFile.name : t("doctorLogin.clickToUploadId")}
                    </p>
                    <p className="text-[10px] text-slate-400">{t("doctorLogin.fileLimit")}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{t("doctorLogin.licenseLabel")}</label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                  <input type="file" accept="image/*,.pdf" required onChange={(e) => setLicenseDocFile(e.target.files?.[0] || null)} disabled={loading} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <div className="text-center">
                    <span className="text-2xl">📜</span>
                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      {licenseDocFile ? licenseDocFile.name : t("doctorLogin.clickToUploadLicense")}
                    </p>
                    <p className="text-[10px] text-slate-400">{t("doctorLogin.fileLimit")}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? t("common.loading") : t("doctorLogin.registerSubmit")}</button>
          </form>
        )}

        <button onClick={onBack} className="mt-4 w-full text-sm text-primary-600 hover:underline">{t("common.back")}</button>
      </div>
    </section>
  );
}
