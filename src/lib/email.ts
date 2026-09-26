import { Resend } from "resend";
import { DRY_RUN, MAX_PRICE, NOTIFY_EMAILS, ORIGIN } from "./config";
import type { FlightMatch } from "./easemytrip";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDestination(match: FlightMatch): string {
  return match.destinationName === match.destination
    ? match.destination
    : `${match.destinationName} (${match.destination})`;
}

function formatMatchRow(match: FlightMatch): string {
  return `<tr>
    <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(formatDestination(match))}</td>
    <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(match.date)}</td>
    <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(match.airline)}</td>
    <td style="padding:8px;border:1px solid #ddd;">${match.price.toLocaleString("en-IN")} ${escapeHtml(match.currency)}</td>
  </tr>`;
}

/**
 * Sends alert email, or skips when DRY_RUN is enabled.
 * @returns true if an email was sent
 */
export async function sendMatchEmail(matches: FlightMatch[]): Promise<boolean> {
  if (DRY_RUN) {
    console.log(
      `DRY_RUN=true: skipping email to [${NOTIFY_EMAILS.join(", ")}] for ${matches.length} match(es)`,
    );
    return false;
  }

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("FROM_EMAIL");

  const destCodes = [...new Set(matches.map((m) => m.destination))].join(", ");
  const rows = matches.map(formatMatchRow).join("");
  const subject = `${matches.length} flight(s) ${ORIGIN}→[${destCodes}] at or below ₹${MAX_PRICE.toLocaleString("en-IN")}`;

  const html = `
    <p>Found <strong>${matches.length}</strong> day(s) from <strong>${ORIGIN}</strong> at or below <strong>₹${MAX_PRICE.toLocaleString("en-IN")}</strong>.</p>
    <table style="border-collapse:collapse;width:100%;max-width:720px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Destination</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Date</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Airline</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const { error } = await resend.emails.send({
    from,
    to: NOTIFY_EMAILS,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  return true;
}
