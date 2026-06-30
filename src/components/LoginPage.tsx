import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import logo from "../logo.png";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
};

export function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(name.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt={t("app.title")} className="mb-4 h-16 w-auto" />
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === "login" ? t("login.title") : t("login.registerBtn")}
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {mode === "register" && (
            <input
              className="input-field"
              placeholder={t("login.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          )}
          <input
            className="input-field"
            type="email"
            placeholder={t("login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            dir="ltr"
          />
          <input
            className="input-field"
            type="password"
            placeholder={t("login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            dir="ltr"
          />
          <button
            type="button"
            className="btn-primary py-3 text-lg font-bold"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? t("common.loading") : mode === "login" ? t("login.title") : t("login.registerBtn")}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? t("login.noAccount") : t("login.haveAccount")}{" "}
          <button
            type="button"
            className="font-medium text-emerald-600 hover:underline"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          >
            {mode === "login" ? t("login.registerBtn") : t("login.title")}
          </button>
        </p>
      </div>
    </section>
  );
}
