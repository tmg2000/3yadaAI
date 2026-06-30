/** عدد أيام الحجز القادمة (اليوم الحالي + الأيام التالية) */
export const BOOKING_WINDOW_DAYS = Math.max(
  1,
  Number(process.env.BOOKING_WINDOW_DAYS) || 5
);

const DEFAULT_HOURS = [10, 14];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** تنسيق موعد: YYYY-MM-DDTHH:00 */
export function formatSlotIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:00`;
}

/**
 * يولّد مواعيد من الآن حتى نهاية نافذة الأيام (اليوم + BOOKING_WINDOW_DAYS - 1).
 */
export function generateDefaultSlots(
  daysAhead = BOOKING_WINDOW_DAYS,
  hours: number[] = DEFAULT_HOURS
): string[] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slots: string[] = [];

  for (let day = 0; day < daysAhead; day++) {
    const base = new Date(startToday);
    base.setDate(base.getDate() + day);
    for (const hour of hours) {
      const slotDate = new Date(base);
      slotDate.setHours(hour, 0, 0, 0);
      if (slotDate > now) {
        slots.push(formatSlotIso(slotDate));
      }
    }
  }

  return slots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

function parseSlot(iso: string): Date | null {
  const d = new Date(iso.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** يبقي المواعيد من الآن حتى نهاية نافذة الأيام فقط */
export function filterBookableSlots(
  slots: string[],
  daysAhead = BOOKING_WINDOW_DAYS
): string[] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endWindow = new Date(startToday);
  endWindow.setDate(endWindow.getDate() + daysAhead - 1);
  endWindow.setHours(23, 59, 59, 999);

  return slots
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => {
      const d = parseSlot(s);
      if (!d) return false;
      return d >= now && d <= endWindow;
    })
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

export function isSlotBookable(slot: string, daysAhead = BOOKING_WINDOW_DAYS): boolean {
  return filterBookableSlots([slot], daysAhead).length > 0;
}

/** فلترة المواعيد المخزنة؛ إن كانت قديمة يُولَّد جدول افتراضي للأيام القادمة */
export function resolveBookableSlots(stored: string[]): string[] {
  const filtered = filterBookableSlots(stored);
  if (filtered.length > 0) return filtered;
  return generateDefaultSlots();
}
