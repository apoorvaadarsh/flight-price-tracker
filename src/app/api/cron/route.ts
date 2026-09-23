import { findMatches } from "@/lib/easemytrip";
import {
  CURRENCY,
  DEPART_DATE_END,
  DEPART_DATE_START,
  DESTINATIONS,
  MAX_PRICE,
  ORIGIN,
} from "@/lib/config";
import { sendMatchEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const matches = await findMatches();
    let emailSent = false;

    if (matches.length > 0) {
      await sendMatchEmail(matches);
      emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      origin: ORIGIN,
      destinations: DESTINATIONS,
      dateRange: { start: DEPART_DATE_START, end: DEPART_DATE_END },
      maxPrice: MAX_PRICE,
      currency: CURRENCY,
      matchCount: matches.length,
      emailSent,
      matches,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
