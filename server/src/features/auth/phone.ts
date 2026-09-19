/**
 * Iranian mobile number handling.
 *
 * Users type numbers six different ways — `0912…`, `+98912…`, `0098912…`,
 * with Persian digits, with spaces or dashes. Everything is normalised to a
 * single canonical form (`+989XXXXXXXXX`) before it is used as a rate-limit
 * key, a challenge key or a user identity, because two spellings of the same
 * number must never be two different accounts.
 */

/** Canonical E.164 for an Iranian mobile. */
export type Msisdn = `+98${string}`;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian and Arabic-Indic digits → ASCII. */
export function toAsciiDigits(input: string): string {
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
    out += ch;
  }
  return out;
}

/**
 * Operator prefixes in service (MCI, Irancell, Rightel, Shatel, …).
 * Kept explicit rather than accepting any `9XX`, so typos in the operator
 * prefix are caught at the edge instead of burning an SMS.
 */
const VALID_PREFIXES = [
  "900", "901", "902", "903", "904", "905",
  "910", "911", "912", "913", "914", "915", "916", "917", "918", "919",
  "920", "921", "922", "923",
  "930", "931", "932", "933", "934", "935", "936", "937", "938", "939",
  "941",
  "990", "991", "992", "993", "994", "995", "996",
] as const;

export interface PhoneParseOk {
  ok: true;
  msisdn: Msisdn;
  /** `0912…` — what Iranian users expect to see echoed back. */
  national: string;
  operatorPrefix: string;
}

export interface PhoneParseError {
  ok: false;
  code: "empty" | "not_numeric" | "bad_length" | "bad_prefix";
  message: string;
}

export type PhoneParseResult = PhoneParseOk | PhoneParseError;

/**
 * Parses any accepted spelling into the canonical form.
 * Pure and total — never throws, always returns a discriminated result.
 */
export function parseIranianMobile(raw: string): PhoneParseResult {
  const trimmed = toAsciiDigits(raw ?? "").replace(/[\s\-()._]/g, "");
  if (trimmed.length === 0) {
    return { ok: false, code: "empty", message: "شماره موبایل را وارد کنید." };
  }

  // Strip every accepted country-code spelling down to the national 9XXXXXXXXX.
  let digits = trimmed;
  if (digits.startsWith("+98")) digits = digits.slice(3);
  else if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  if (!/^\d+$/.test(digits)) {
    return { ok: false, code: "not_numeric", message: "شماره موبایل فقط باید شامل رقم باشد." };
  }
  if (digits.length !== 10) {
    return { ok: false, code: "bad_length", message: "شماره موبایل باید ۱۱ رقم باشد؛ مثل ۰۹۱۲۳۴۵۶۷۸۹." };
  }

  const prefix = digits.slice(0, 3);
  if (!digits.startsWith("9") || !(VALID_PREFIXES as readonly string[]).includes(prefix)) {
    return { ok: false, code: "bad_prefix", message: "پیش‌شماره اپراتور معتبر نیست." };
  }

  return {
    ok: true,
    msisdn: `+98${digits}`,
    national: `0${digits}`,
    operatorPrefix: prefix,
  };
}

/**
 * `+989123456789` → `0912***6789`, for logs and for the “code sent to…” line.
 * ASCII on the wire; the client renders it with `toFa`.
 */
export function maskMsisdn(msisdn: string): string {
  const national = msisdn.replace(/^\+98/, "0");
  if (national.length !== 11) return "***";
  return `${national.slice(0, 4)}***${national.slice(7)}`;
}
