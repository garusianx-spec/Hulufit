/** Persian-first formatting helpers. IRANYekan renders Persian digits natively. */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function faNumber(value: number, fractionDigits = 0): string {
  const fixed = value.toFixed(fractionDigits);
  const [intPart, frac] = fixed.split(".");
  // ٬ thousands separator, ٫ decimal mark — the Persian conventions.
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toFa(frac ? `${grouped}٫${frac}` : grouped);
}

export function faToman(value: number): string {
  return `${faNumber(value)} تومان`;
}

/** 1_572_864 → "۱٫۵ مگابایت" */
export function faFileSize(bytes: number): string {
  if (bytes < 1024) return `${faNumber(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNumber(bytes / 1024, 0)} کیلوبایت`;
  const mb = bytes / (1024 * 1024);
  return `${faNumber(mb, Number.isInteger(mb) ? 0 : 1)} مگابایت`;
}

export function faDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${toFa(m)}:${toFa(String(s).padStart(2, "0"))}`;
}

const FA_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Converts an ISO date to a Jalali tuple using the platform calendar. */
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const parts = jalaliFormatter.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function faDate(iso: string | Date, withYear = false): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const { year, month, day } = toJalali(d);
  const label = `${toFa(day)} ${FA_MONTHS[Math.max(0, month - 1)]}`;
  return withYear ? `${label} ${toFa(year)}` : label;
}

export function faTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${toFa(h)}:${toFa(m)}`;
}

/** "چند لحظه پیش" / "۳ دقیقه پیش" / "دیروز" */
export function faRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "چند لحظه پیش";
  if (diff < 3600) return `${toFa(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toFa(Math.floor(diff / 3600))} ساعت پیش`;
  if (diff < 172800) return "دیروز";
  if (diff < 604800) return `${toFa(Math.floor(diff / 86400))} روز پیش`;
  return faDate(d, true);
}

/** Day separators inside the chat transcript. */
export function faDayLabel(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Compare calendar days, not elapsed hours — otherwise yesterday evening
  // still reads as "امروز".
  const startOfThatDay = new Date(d);
  startOfThatDay.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86400000);
  if (dayDiff <= 0) return "امروز";
  if (dayDiff === 1) return "دیروز";
  return faDate(d, dayDiff > 200);
}

export const WEEKDAYS_FA = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

/** 0 = Saturday, matching the Persian week used across the plans tab. */
export function persianWeekdayIndex(date = new Date()): number {
  return (date.getDay() + 1) % 7;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
