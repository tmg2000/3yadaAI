import { useState } from "react";
import { useI18n } from "../i18n";
import logo from "../logo.png";

type Props = {
  onLogin: (admin: any, token: string) => void;
  onBack: () => void;
};

export function AdminLoginPage({ onLogin, onBack }: Props) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { adminLogin } = await import("../api-admin");
      const res = await adminLogin(email, password);
      onLogin(res.admin, res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="card p-8 text-center">
          <img src={logo} alt={t("app.title")} className="mx-auto h-14 w-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">{t("admin.loginTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("admin.loginSubtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div>
            )}
            <div>
              <input
                type="email"
                placeholder={t("login.email")}
                className="input-field w-full text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder={t("login.password")}
                className="input-field w-full text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t("common.loading") : t("admin.loginBtn")}
            </button>
          </form>

          <button onClick={onBack} className="mt-4 text-xs text-slate-400 hover:text-slate-600">
            ← {t("common.back")}
          </button>
        </div>
      </div>
    </section>
  );
}
