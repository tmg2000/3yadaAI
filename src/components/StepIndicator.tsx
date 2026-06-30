import { useI18n } from "../i18n";
import type { AppStep } from "../types";

type StepIndicatorProps = {
  current: AppStep;
};

const stepOrder: AppStep[] = ["chat", "summary", "doctors", "booking", "confirmation"];

export function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useI18n();
  const currentIndex = stepOrder.indexOf(current);
  if (currentIndex < 0) return null;

  const stepKeys: { key: AppStep; labelKey: string }[] = [
    { key: "chat", labelKey: "step.symptoms" },
    { key: "summary", labelKey: "step.summary" },
    { key: "doctors", labelKey: "step.doctors" },
    { key: "booking", labelKey: "step.booking" },
    { key: "confirmation", labelKey: "step.confirmation" },
  ];

  return (
    <nav className="mb-6 overflow-x-auto" aria-label={t("step.symptoms")}>
      <ol className="flex min-w-max items-center gap-1 px-1">
        {stepKeys.map((s, i) => {
          const isActive = s.key === current;
          const isDone = currentIndex > stepOrder.indexOf(s.key);

          return (
            <li key={s.key} className="flex items-center">
              {i > 0 && (
                <span className={`mx-1 h-0.5 w-4 sm:w-8 ${isDone ? "bg-primary-500" : "bg-border"}`} />
              )}
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition sm:px-3 ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : isDone
                      ? "bg-primary-100 text-primary-800"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    isActive ? "bg-white/20" : isDone ? "bg-primary-200" : "bg-slate-200"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{t(s.labelKey)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
