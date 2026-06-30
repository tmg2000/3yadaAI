export type AppConfig = {
  /** فارغ = نفس عنوان الموقع (مناسب للنشر على الإنترنت). */
  apiBaseUrl?: string;
};

let resolvedApiBase = "";

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return resolvedApiBase;
}

async function loadJsonConfig(): Promise<AppConfig> {
  try {
    const res = await fetch("/app-config.json", { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as AppConfig;
  } catch {
    return {};
  }
}

/**
 * ترتيب الأولوية:
 * 1) VITE_API_BASE_URL وقت البناء (اختياري — لتطبيق الموبايل على سيرفر بعيد)
 * 2) public/app-config.json (فارغ = نفس الموقع)
 *
 * بدون عنوان: الطلبات تذهب إلى /api على نفس النطاق (ويب + نشر إنتاج).
 */
export async function initAppConfig(): Promise<string> {
  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "");
  if (fromEnv) {
    resolvedApiBase = fromEnv;
    return resolvedApiBase;
  }

  const fileConfig = await loadJsonConfig();
  resolvedApiBase = normalizeBaseUrl(fileConfig.apiBaseUrl ?? "");
  return resolvedApiBase;
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolvedApiBase}${normalizedPath}`;
}

export function uploadUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/uploads/${path}`;
  return apiUrl(normalizedPath);
}
