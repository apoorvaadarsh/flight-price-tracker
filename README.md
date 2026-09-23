# Flight Price Tracker (BLR → PAT)

Next.js app for Vercel that runs a **daily cron** job, fetches cheapest-day fares from EaseMyTrip’s FareCalendar for **BLR** → **PAT** across a hardcoded date range, and sends an email via [Resend](https://resend.com/) when any day is at or below your hardcoded max price.

## Configure the search

Edit [`src/lib/config.ts`](src/lib/config.ts):

- `DEPART_DATE_START` / `DEPART_DATE_END` — inclusive departure dates (`YYYY-MM-DD`)
- `ORIGIN` / `DESTINATION` — IATA codes (default BLR / PAT)

Each FareCalendar call returns roughly a month of prices (anchor date −4 through +24). Short ranges usually need one request per cron run.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sender (e.g. `onboarding@resend.dev` for testing, or a verified domain) |
| `NOTIFY_EMAIL` | Your inbox |
| `MAX_PRICE` | Alert threshold in INR |
| `CRON_SECRET` | Random string; required to call `/api/cron` |

No EaseMyTrip API key is required; the cron fetches FareCalendar server-side.

### Resend

1. Create an account at [resend.com](https://resend.com/).
2. Add an API key and set `NOTIFY_EMAIL` to your address.
3. For quick tests, `FROM_EMAIL=onboarding@resend.dev` works with Resend’s sandbox.

## Local development

```bash
npm install
npm run dev
```

Trigger the job manually:

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron | jq
```

To confirm email delivery, temporarily set a very high `MAX_PRICE` in `.env.local` so fares qualify, then run the curl again.

## Deploy on Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/).
2. Add all environment variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Deploy. [`vercel.json`](vercel.json) registers a cron at **03:00 UTC daily** hitting `/api/cron`.
4. In the Vercel dashboard, confirm **Cron Jobs** shows `/api/cron`.

Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations when `CRON_SECRET` is set in the project.

## API

`GET /api/cron` — requires `Authorization: Bearer ${CRON_SECRET}`.

Returns JSON with `matchCount`, `matches`, and `emailSent` (true when at least one match was emailed).

## Notes

- If a cheap day stays available, you may get one email per day until it disappears (no deduplication by design).
- FareCalendar returns daily cheapest fares (airline + total), not individual flight times.
- Failed calendar fetches for one anchor date are logged and skipped; other anchors still run.
