import { useI18n } from "../i18n";
import logo from "../logo.png";

type HomePageProps = {
  userName: string;
  onStartConsultation: () => void;
  onViewHistory: () => void;
  onViewCalendar: () => void;
  onViewProfile: () => void;
  loading: boolean;
  aiReady: boolean;
};

export function HomePage({
  userName,
  onStartConsultation,
  onViewHistory,
  onViewCalendar,
  onViewProfile,
  loading,
  aiReady,
}: HomePageProps) {
  const { t } = useI18n();
  return (
    <section className="animate-fade-in-up text-center max-w-2xl mx-auto my-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-white to-slate-50 p-4 shadow-xl border border-slate-100">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-tr from-emerald-500 to-blue-500 opacity-20 blur-sm" />
            <img src={logo} alt={t("app.title")} className="relative h-full w-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {t("home.welcome")} {userName}
          </h2>
          <p className="mt-2 text-slate-500">{t("home.greeting")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onStartConsultation}
            disabled={loading || !aiReady}
            className="group rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-right transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <span className="text-3xl">{loading ? "⏳" : "💬"}</span>
            <h4 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-emerald-700">
              {loading ? t("common.loading") : t("home.startConsultation")}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? t("common.loading")
                : !aiReady
                  ? t("header.aiNotReady")
                  : t("home.startDescription")}
            </p>
          </button>

          <button
            onClick={onViewHistory}
            className="group rounded-2xl border border-blue-100 bg-blue-50 p-6 text-right transition hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-3xl">📋</span>
            <h4 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-blue-700">{t("home.viewHistory")}</h4>
            <p className="mt-1 text-sm text-slate-500">{t("home.historyDescription")}</p>
          </button>

          <button
            onClick={onViewCalendar}
            className="group rounded-2xl border border-purple-100 bg-purple-50 p-6 text-right transition hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-3xl">📅</span>
            <h4 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-purple-700">{t("home.viewCalendar")}</h4>
            <p className="mt-1 text-sm text-slate-500">{t("home.calendarDescription")}</p>
          </button>

          <button
            onClick={onViewProfile}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 text-right transition hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-3xl">👤</span>
            <h4 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-slate-700">{t("home.viewProfile")}</h4>
            <p className="mt-1 text-sm text-slate-500">{t("home.profileDescription")}</p>
          </button>
        </div>

        {!aiReady && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ {t("header.aiNotReady")}
          </div>
        )}
      </div>
    </section>
  );
}
