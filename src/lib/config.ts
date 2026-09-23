export const ORIGIN = "BLR";

export type Destination = {
  code: string;
  name: string;
};

/** Destinations to check each cron run (same origin / date window / max price). */
export const DESTINATIONS: Destination[] = [
  { code: "DEL", name: "New Delhi (IGI)" },
  { code: "HDO", name: "Ghaziabad (Hindon)" },
  { code: "JAI", name: "Jaipur" },
  { code: "AGR", name: "Agra" },
  { code: "GWL", name: "Gwalior" },
];

/** Inclusive departure date range (YYYY-MM-DD). Edit for your trip window. */
export const DEPART_DATE_START = "2026-10-01";
export const DEPART_DATE_END = "2026-10-07";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/** Notify when cheapest-day fare is at or below this amount. */
export const MAX_PRICE = Number(requireEnv("MAX_PRICE"));
if (!Number.isFinite(MAX_PRICE) || MAX_PRICE <= 0) {
  throw new Error("MAX_PRICE must be a positive number");
}

export const CURRENCY = "INR";

export function getDepartureDates(): string[] {
  const dates: string[] = [];
  const start = new Date(`${DEPART_DATE_START}T00:00:00.000Z`);
  const end = new Date(`${DEPART_DATE_END}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid DEPART_DATE_START or DEPART_DATE_END");
  }
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
