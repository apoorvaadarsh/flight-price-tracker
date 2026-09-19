export const ORIGIN = "BLR";
export const DESTINATION = "PAT";

/** Inclusive departure date range (YYYY-MM-DD). Edit for your trip window. */
export const DEPART_DATE_START = "2026-10-01";
export const DEPART_DATE_END = "2026-10-07";

/** Notify when offer grand total is at or below this amount. */
export const MAX_PRICE = 8000;
export const CURRENCY = "INR";
export const ADULTS = 1;

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
