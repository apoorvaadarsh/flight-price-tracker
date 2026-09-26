# Flight Price Tracker

Next.js app for Vercel that runs a **daily cron** job, fetches cheapest-day fares from EaseMyTrip’s FareCalendar for an origin → list of destinations across a date range, and emails you via [Resend](https://resend.com/) when any day is at or below your max price.

No EaseMyTrip API key is required; the cron fetches FareCalendar server-side.

## Configure via environment variables

You do **not** need to edit code to change the trip. Set values in:

- **Local:** `.env.local` (copy from [`.env.example`](.env.example))
- **Production:** Vercel → **Project → Settings → Environment Variables**, then **Redeploy** (no git push required)

### List format

Every multi-value setting uses the same shape (brackets recommended; a single item still uses brackets):

```text
[value1, value2, value3]
```

Examples: `DESTINATIONS=[DEL, HDO, JAI]` and `NOTIFY_EMAILS=[you@example.com]`.

### Trip search

| Variable | Example | Rules |
|----------|---------|--------|
| `ORIGIN` | `BLR` | Single 3-letter IATA (not a list) |
| `DESTINATIONS` | `[DEL, HDO, JAI, AGR, GWL]` | List of IATA codes; no duplicates; must not include `ORIGIN` |
| `DEPART_DATE_START` | `2026-10-30` | Inclusive `YYYY-MM-DD` |
| `DEPART_DATE_END` | `2026-11-05` | Inclusive `YYYY-MM-DD` |
| `MAX_PRICE` | `12000` | Alert when cheapest-day fare ≤ this amount (INR) |

Typical North India example from Bangalore:

```bash
ORIGIN=BLR
DESTINATIONS=[DEL, HDO, JAI, AGR, GWL]
DEPART_DATE_START=2026-10-30
DEPART_DATE_END=2026-11-05
MAX_PRICE=12000
```

### Who gets email + dry run

| Variable | Example | Rules |
|----------|---------|--------|
| `NOTIFY_EMAILS` | `[you@example.com, friend@example.com]` | Same `[a, b]` list format |
| `DRY_RUN` | `false` | `true` / `1` / `yes` → fetch matches but **do not** send email |

Legacy: if `NOTIFY_EMAILS` is unset, a single `NOTIFY_EMAIL=you@example.com` still works.

**Safe production test**

1. Set `DRY_RUN=true` in Vercel and Redeploy.
2. Call `/api/cron` (see below). Expect `"dryRun": true` and `"emailSent": false`.
3. Set `DRY_RUN=false` and Redeploy for real alerts.

### Secrets (always required)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sender (`onboarding@resend.dev` for Resend sandbox, or a verified domain) |
| `CRON_SECRET` | Random string; required to call `/api/cron` |

### Resend

1. Create an account at [resend.com](https://resend.com/).
2. Add an API key and set `NOTIFY_EMAILS` to your address(es).
3. For quick tests, `FROM_EMAIL=onboarding@resend.dev` works with Resend’s sandbox (recipient must be your Resend account email).

## Local development

```bash
cp .env.example .env.local
# fill in secrets + trip settings
npm install
npm run dev
```

Trigger the job manually:

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron | jq
```

To confirm email delivery, set `DRY_RUN=false` and a high enough `MAX_PRICE` so fares qualify, then run the curl again.

## Deploy on Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/).
2. Add all environment variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Deploy. [`vercel.json`](vercel.json) registers a cron at **03:00 UTC daily** hitting `/api/cron`.
4. In the Vercel dashboard, confirm **Cron Jobs** shows `/api/cron`.

Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations when `CRON_SECRET` is set in the project.

After changing env vars later, click **Redeploy** so the cron picks them up.

## API

`GET /api/cron` — requires `Authorization: Bearer ${CRON_SECRET}`.

Returns JSON including `matchCount`, `matches`, `dryRun`, and `emailSent` (`true` only when an email was actually sent).

## Notes

- If a cheap day stays available, you may get one email per day until it disappears (no deduplication by design).
- FareCalendar returns daily cheapest fares (airline + total), not individual flight times or stops.
- Failed calendar fetches for one destination/anchor are logged and skipped; other destinations still run.
- Each FareCalendar call returns roughly a month of prices (anchor date −4 through +24).
