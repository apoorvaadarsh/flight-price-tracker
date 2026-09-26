export type Destination = {
  code: string;
  name: string;
};

const IATA_RE = /^[A-Z]{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/** Shared list syntax: `[a, b, c]` (brackets optional). */
export function parseEnvList(raw: string): string[] {
  let text = raw.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    text = text.slice(1, -1).trim();
  }
  const items = text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    throw new Error("Environment list must contain at least one value");
  }
  return items;
}

function parseIataCode(raw: string, envName: string): string {
  const code = raw.trim().toUpperCase();
  if (!IATA_RE.test(code)) {
    throw new Error(
      `Invalid IATA in ${envName}: "${raw}" (expected 3 letters, e.g. BLR)`,
    );
  }
  return code;
}

function parseIataList(raw: string, envName: string): string[] {
  const codes = parseEnvList(raw).map((item) => parseIataCode(item, envName));
  const unique = new Set(codes);
  if (unique.size !== codes.length) {
    throw new Error(`${envName} must not contain duplicate IATA codes`);
  }
  return codes;
}

function parseEmailList(raw: string, envName: string): string[] {
  const emails = parseEnvList(raw).map((item) => {
    const email = item.trim();
    if (!EMAIL_RE.test(email)) {
      throw new Error(`Invalid email in ${envName}: "${item}"`);
    }
    return email;
  });
  const unique = new Set(emails.map((e) => e.toLowerCase()));
  if (unique.size !== emails.length) {
    throw new Error(`${envName} must not contain duplicate addresses`);
  }
  return emails;
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  throw new Error(
    `Invalid boolean "${raw}" (use true/false, 1/0, or yes/no)`,
  );
}

function parseIsoDate(raw: string, envName: string): string {
  const date = raw.trim();
  if (!ISO_DATE_RE.test(date)) {
    throw new Error(
      `Invalid ${envName}: "${raw}" (expected YYYY-MM-DD)`,
    );
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid calendar date in ${envName}: "${raw}"`);
  }
  return date;
}

export const ORIGIN = parseIataCode(requireEnv("ORIGIN"), "ORIGIN");

const destinationCodes = parseIataList(
  requireEnv("DESTINATIONS"),
  "DESTINATIONS",
);
if (destinationCodes.includes(ORIGIN)) {
  throw new Error("ORIGIN must not appear in DESTINATIONS");
}

/** Destinations to check each cron run (same origin / date window / max price). */
export const DESTINATIONS: Destination[] = destinationCodes.map((code) => ({
  code,
  name: code,
}));

/** Inclusive departure date range (YYYY-MM-DD). */
export const DEPART_DATE_START = parseIsoDate(
  requireEnv("DEPART_DATE_START"),
  "DEPART_DATE_START",
);
export const DEPART_DATE_END = parseIsoDate(
  requireEnv("DEPART_DATE_END"),
  "DEPART_DATE_END",
);

/** Notify when cheapest-day fare is at or below this amount. */
export const MAX_PRICE = Number(requireEnv("MAX_PRICE"));
if (!Number.isFinite(MAX_PRICE) || MAX_PRICE <= 0) {
  throw new Error("MAX_PRICE must be a positive number");
}

function resolveNotifyEmails(): string[] {
  const list = process.env.NOTIFY_EMAILS;
  if (list && list.trim() !== "") {
    return parseEmailList(list, "NOTIFY_EMAILS");
  }
  const legacy = process.env.NOTIFY_EMAIL;
  if (legacy && legacy.trim() !== "") {
    return parseEmailList(`[${legacy.trim()}]`, "NOTIFY_EMAIL");
  }
  throw new Error(
    "Missing environment variable: NOTIFY_EMAILS (or legacy NOTIFY_EMAIL)",
  );
}

export const NOTIFY_EMAILS = resolveNotifyEmails();

/** When true, cron still fetches matches but does not send email. */
export const DRY_RUN = parseBool(process.env.DRY_RUN, false);

export const CURRENCY = "INR";

export function getDepartureDates(): string[] {
  const dates: string[] = [];
  const start = new Date(`${DEPART_DATE_START}T00:00:00.000Z`);
  const end = new Date(`${DEPART_DATE_END}T00:00:00.000Z`);

  if (start > end) {
    throw new Error("DEPART_DATE_START must be on or before DEPART_DATE_END");
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
