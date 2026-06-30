import { useI18n } from "../i18n";
import logo from "../logo.png";

type HeaderProps = {
  aiReady: boolean;
  userName?: string;
  onLogout?: () => void;
  onHome?: () => void;
};

export function Header({ aiReady, userName, onLogout, onHome }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button onClick={onHome} className="flex items-center gap-2">
            <img src={logo} alt={t("app.title")} className="h-9 w-auto object-contain" />
            <div className="border-r border-slate-200 pr-3">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">{t("app.title")}</h1>
              <p className="text-[11px] font-medium text-slate-500">{t("app.subtitle")}</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="text-xs font-medium text-slate-500 hover:text-primary-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
          >
            {locale === "ar" ? "English" : "العربية"}
          </button>

          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs ${
              aiReady
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
            title={aiReady ? "AI system is active and ready" : "AI service is offline"}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiReady ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aiReady ? "bg-emerald-500" : "bg-amber-500"}`} />
            </span>
            {aiReady ? t("header.aiReady") : t("header.aiNotReady")}
          </div>

          {userName && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm text-slate-600">{userName}</span>
              {onLogout && (
                <button onClick={onLogout} className="text-xs text-slate-400 hover:text-red-500" title={t("header.logout")}>
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
