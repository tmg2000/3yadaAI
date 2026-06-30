import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import ar from "./ar";
import en from "./en";

export type Locale = "ar" | "en";

type TranslationDict = Record<string, string>;

const dictionaries: Record<Locale, TranslationDict> = { ar, en };

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem("locale");
    if (stored === "en" || stored === "ar") return stored;
    return "ar";
  });

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale];
      let val = dict[key];
      if (val === undefined) {
        val = dictionaries.ar[key] ?? key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [locale]
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  const handleSetLocale = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem("locale", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
