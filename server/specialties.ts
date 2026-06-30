/** مفاتيح التخصصات المعتمدة في التطبيق */
export const VALID_SPECIALTY_KEYS = [
  "general",
  "internal",
  "pediatrics",
  "cardiology",
  "dermatology",
  "orthopedics",
  "gynecology",
  "ent",
  "psychiatry",
  "ophthalmology",
  "dentistry",
] as const;

export type SpecialtyKey = (typeof VALID_SPECIALTY_KEYS)[number];

const ALIASES: Record<string, SpecialtyKey> = {
  general: "general",
  "طب عام": "general",
  internal: "internal",
  "باطنية": "internal",
  pediatrics: "pediatrics",
  "أطفال": "pediatrics",
  cardiology: "cardiology",
  "قلبية": "cardiology",
  dermatology: "dermatology",
  "جلدية": "dermatology",
  orthopedics: "orthopedics",
  "عظام": "orthopedics",
  gynecology: "gynecology",
  "نساء وولادة": "gynecology",
  ent: "ent",
  "أنف وأذن وحنجرة": "ent",
  psychiatry: "psychiatry",
  "طب نفسي": "psychiatry",
  ophthalmology: "ophthalmology",
  "عيون": "ophthalmology",
  dentistry: "dentistry",
  "أسنان": "dentistry",
};

/** يطبّع مفاتيح التخصص القادمة من الـ LLM أو الواجهة */
export function normalizeSpecialtyKeys(raw: string[]): SpecialtyKey[] {
  const out: SpecialtyKey[] = [];
  for (const item of raw) {
    const key = item.trim().toLowerCase().replace(/\s+/g, "_");
    const mapped =
      (VALID_SPECIALTY_KEYS as readonly string[]).includes(key)
        ? (key as SpecialtyKey)
        : ALIASES[item.trim()] ?? ALIASES[key];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}
