import {
  CURRENCY,
  DEPART_DATE_END,
  DEPART_DATE_START,
  DESTINATION,
  getDepartureDates,
  MAX_PRICE,
  ORIGIN,
} from "./config";

export type FlightMatch = {
  date: string;
  price: number;
  currency: string;
  airline: string;
  departTime: string;
  arriveTime: string;
};

type FareCalendarRow = {
  DepDate: string;
  TtlFre: string;
  AirCode: string;
  IsCurrent?: boolean;
  Cheapest?: number;
  IsCheapest?: boolean;
};

const FARE_CALENDAR_URL =
  "https://flightservice-node.easemytrip.com/FareCalendar/FareCalendarByDate";

/** Format YYYY-MM-DD as DD/MM/YYYY for CalKey_. */
function toCalKeyDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  return `${day}/${month}/${year}`;
}

/** Normalize DepDate (YYYY-MM-DD or similar) to YYYY-MM-DD. */
function normalizeDepDate(depDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(depDate)) {
    return depDate;
  }
  // DD/MM/YYYY fallback
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(depDate);
  if (slash) {
    return `${slash[3]}-${slash[2]}-${slash[1]}`;
  }
  throw new Error(`Unexpected DepDate format: ${depDate}`);
}

async function fetchFareCalendar(anchorIsoDate: string): Promise<FareCalendarRow[]> {
  const calKey = `${ORIGIN}_${DESTINATION}_${toCalKeyDate(anchorIsoDate)}`;

  const response = await fetch(FARE_CALENDAR_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Referer: "https://www.easemytrip.com/",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36",
    },
    body: JSON.stringify({ CalKey_: calKey }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `EaseMyTrip FareCalendar failed for ${calKey} (${response.status}): ${text}`,
    );
  }

  const payload = (await response.json()) as FareCalendarRow[];
  if (!Array.isArray(payload)) {
    throw new Error(`EaseMyTrip FareCalendar returned non-array for ${calKey}`);
  }
  return payload;
}

function rowToMatch(
  row: FareCalendarRow,
  allowedDates: Set<string>,
): FlightMatch | null {
  let date: string;
  try {
    date = normalizeDepDate(row.DepDate);
  } catch {
    return null;
  }

  if (!allowedDates.has(date)) {
    return null;
  }

  const price = Number.parseFloat(row.TtlFre);
  if (Number.isNaN(price) || price > MAX_PRICE) {
    return null;
  }

  return {
    date,
    price,
    currency: CURRENCY,
    airline: row.AirCode || "Unknown",
    departTime: "—",
    arriveTime: "—",
  };
}

/** Shift YYYY-MM-DD by `deltaDays` in UTC. */
function addDays(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch cheap-day fares covering [DEPART_DATE_START, DEPART_DATE_END].
 * Each FareCalendar call returns roughly anchor−4 … anchor+24; we walk
 * uncovered dates using the earliest uncovered date as the next anchor.
 */
export async function findMatches(): Promise<FlightMatch[]> {
  const allowedDates = new Set(getDepartureDates());
  const uncovered = new Set(allowedDates);
  const byDate = new Map<string, FlightMatch>();

  while (uncovered.size > 0) {
    const anchor = [...uncovered].sort()[0]!;
    const windowStart = addDays(anchor, -4);
    const windowEnd = addDays(anchor, 24);

    try {
      const rows = await fetchFareCalendar(anchor);
      for (const row of rows) {
        const match = rowToMatch(row, allowedDates);
        if (match) {
          const existing = byDate.get(match.date);
          if (!existing || match.price < existing.price) {
            byDate.set(match.date, match);
          }
        }
      }
    } catch (error) {
      console.error(`Skipping FareCalendar anchor ${anchor}:`, error);
      uncovered.delete(anchor);
      continue;
    }

    // Mark the theoretical API window as covered so missing days don't loop.
    for (const date of [...uncovered]) {
      if (date >= windowStart && date <= windowEnd) {
        uncovered.delete(date);
      }
    }
  }

  const matches = [...byDate.values()].filter(
    (m) => m.date >= DEPART_DATE_START && m.date <= DEPART_DATE_END,
  );
  matches.sort((a, b) => a.price - b.price);
  return matches;
}
