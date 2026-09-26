import {
  CURRENCY,
  DEPART_DATE_END,
  DEPART_DATE_START,
  DESTINATIONS,
  DRY_RUN,
  MAX_PRICE,
  ORIGIN,
} from "@/lib/config";

export default function Home() {
  const destLabel = DESTINATIONS.map((d) => d.code).join(", ");

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Flight price tracker
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A daily Vercel cron checks EaseMyTrip FareCalendar for cheap flights
          and emails you when a match is found.
        </p>

        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <dt className="shrink-0 text-zinc-500">Origin</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
              {ORIGIN}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <dt className="shrink-0 text-zinc-500">Destinations</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
              {destLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <dt className="text-zinc-500">Date range</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {DEPART_DATE_START} – {DEPART_DATE_END}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <dt className="text-zinc-500">Max price</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {MAX_PRICE.toLocaleString("en-IN")} {CURRENCY}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <dt className="text-zinc-500">Dry run</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {DRY_RUN ? "on (no email)" : "off"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Schedule</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              Daily (03:00 UTC)
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-xs text-zinc-500">
          Configure trip and alert settings via environment variables (see{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            README.md
          </code>
          ). Manual run:{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            GET /api/cron
          </code>{" "}
          with{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            Authorization: Bearer CRON_SECRET
          </code>
          .
        </p>
      </main>
    </div>
  );
}
