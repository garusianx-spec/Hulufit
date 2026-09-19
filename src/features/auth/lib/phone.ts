import { toFa } from "@/lib/format";

/**
 * Client-side mirror of the gateway's phone parser.
 *
 * This exists so the keypad can reject a typo before it costs an SMS, and so
 * the field can echo a grouped number back as the user types. The server
 * re-validates everything — nothing here is a security control.
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian and Arabic-Indic digits → ASCII, everything else dropped. */
export function digitsOnly(input: string): string {
  let out = "";
  for (const ch of input) {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa !== -1) {
      out += String(fa);
      continue;
    }
    const ar = AR_DIGITS.indexOf(ch);
    if (ar !== -1) {
      out += String(ar);
      continue;
    }
    if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

const VALID_PREFIXES = new Set([
  "900", "901", "902", "903", "904", "905",
  "910", "911", "912", "913", "914", "915", "916", "917", "918", "919",
  "920", "921", "922", "923",
  "930", "931", "932", "933", "934", "935", "936", "937", "938", "939",
  "941",
  "990", "991", "992", "993", "994", "995", "996",
]);

/** Everything after the country code: `9XXXXXXXXX`, at most ten digits. */
export function toNationalDigits(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export interface PhoneCheck {
  /** `+989XXXXXXXXX`, or null while the number is still incomplete. */
  msisdn: string | null;
  /** Non-null once the user has typed enough for the problem to be real. */
  error: string | null;
  complete: boolean;
}

export function checkPhone(raw: string): PhoneCheck {
  const digits = toNationalDigits(raw);
  const complete = digits.length === 10;

  if (digits.length === 0) return { msisdn: null, error: null, complete: false };
  if (!digits.startsWith("9")) {
    return { msisdn: null, error: "شماره موبایل با ۰۹ شروع می‌شود.", complete: false };
  }
  // Hold the prefix complaint until all three digits are in — otherwise the
  // field shouts at the user mid-keystroke.
  if (digits.length >= 3 && !VALID_PREFIXES.has(digits.slice(0, 3))) {
    return { msisdn: null, error: "پیش‌شماره اپراتور معتبر نیست.", complete: false };
  }
  if (!complete) return { msisdn: null, error: null, complete: false };

  return { msisdn: `+98${digits}`, error: null, complete: true };
}

/**
 * `09123456789` → `۹۱۲ ۳۴۵ ۶۷۸۹`.
 *
 * The leading zero is absorbed because the field already carries a `+۹۸`
 * label, and `+۹۸ ۰۹۱۲…` would be a number that does not exist.
 */
export function formatNational(raw: string): string {
  const digits = toNationalDigits(raw);
  if (digits.length === 0) return "";
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  return toFa(groups.join(" "));
}

/** `+989123456789` → `۰۹۱۲‌***‌۶۷۸۹` for the “code sent to…” line. */
export function maskForDisplay(msisdn: string): string {
  const national = msisdn.replace(/^\+98/, "0");
  if (national.length !== 11) return "—";
  return `${toFa(national.slice(0, 4))}***${toFa(national.slice(7))}`;
}
