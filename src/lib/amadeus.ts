import {
  ADULTS,
  CURRENCY,
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

type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
};

type AmadeusFlightOffersResponse = {
  data?: AmadeusFlightOffer[];
};

type AmadeusFlightOffer = {
  price: {
    grandTotal: string;
    currency: string;
  };
  validatingAirlineCodes?: string[];
  itineraries?: Array<{
    segments?: Array<{
      carrierCode?: string;
      departure?: { at?: string };
      arrival?: { at?: string };
    }>;
  }>;
};

function getAmadeusBaseUrl(): string {
  return (
    process.env.AMADEUS_API_BASE?.replace(/\/$/, "") ??
    "https://test.api.amadeus.com"
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const clientId = requireEnv("AMADEUS_CLIENT_ID");
  const clientSecret = requireEnv("AMADEUS_CLIENT_SECRET");
  const baseUrl = getAmadeusBaseUrl();

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amadeus token request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as AmadeusTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function searchOffers(
  accessToken: string,
  departureDate: string,
): Promise<AmadeusFlightOffer[]> {
  const baseUrl = getAmadeusBaseUrl();
  const params = new URLSearchParams({
    originLocationCode: ORIGIN,
    destinationLocationCode: DESTINATION,
    departureDate,
    adults: String(ADULTS),
    currencyCode: CURRENCY,
    max: "10",
  });

  const response = await fetch(
    `${baseUrl}/v2/shopping/flight-offers?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Amadeus flight search failed for ${departureDate} (${response.status}): ${text}`,
    );
  }

  const payload = (await response.json()) as AmadeusFlightOffersResponse;
  return payload.data ?? [];
}

function offerToMatch(date: string, offer: AmadeusFlightOffer): FlightMatch | null {
  const price = Number.parseFloat(offer.price.grandTotal);
  if (Number.isNaN(price) || price > MAX_PRICE) {
    return null;
  }

  const segments = offer.itineraries?.[0]?.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];

  const airline =
    offer.validatingAirlineCodes?.[0] ??
    first?.carrierCode ??
    "Unknown";

  return {
    date,
    price,
    currency: offer.price.currency || CURRENCY,
    airline,
    departTime: first?.departure?.at ?? "—",
    arriveTime: last?.arrival?.at ?? "—",
  };
}

export async function findMatches(): Promise<FlightMatch[]> {
  const token = await getAccessToken();
  const dates = getDepartureDates();
  const matches: FlightMatch[] = [];

  for (const date of dates) {
    try {
      const offers = await searchOffers(token, date);
      for (const offer of offers) {
        const match = offerToMatch(date, offer);
        if (match) {
          matches.push(match);
        }
      }
    } catch (error) {
      console.error(`Skipping ${date}:`, error);
    }
  }

  matches.sort((a, b) => a.price - b.price);
  return matches;
}
