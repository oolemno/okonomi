// Vercel serverless function – Node.js runtime
// Handles Yahoo Finance auth (crumb + cookie) server-side so the browser
// never has to deal with CORS or rate limiting.
// Called by the frontend as GET /api/market?symbols=OSEBX.OL,BZ=F

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Module-level cache — persists across warm invocations on the same container
let crumb: string | null = null;
let cookie: string | null = null;
let crumbExpiry = 0;

async function refreshSession() {
  const res = await fetch(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com/",
      },
    }
  );
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  crumb = (await res.text()).trim();
  crumbExpiry = Date.now() + 25 * 60 * 1000; // 25 min TTL
}

async function yahooChart(symbol: string) {
  if (!crumb || Date.now() > crumbExpiry) await refreshSession();

  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1mo&interval=1d&crumb=${encodeURIComponent(crumb!)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://finance.yahoo.com/",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (res.status === 401 || res.status === 429) {
    // Stale crumb — refresh once and retry
    await refreshSession();
    const retry = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?range=1mo&interval=1d&crumb=${encodeURIComponent(crumb!)}`,
      {
        headers: {
          "User-Agent": UA,
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://finance.yahoo.com/",
          ...(cookie ? { Cookie: cookie } : {}),
        },
      }
    );
    if (!retry.ok) throw new Error(`Yahoo ${symbol}: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`Yahoo ${symbol}: ${res.status}`);
  return res.json();
}

export default async function handler(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Response> {
  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "OSEBX.OL,BZ=F")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const results = await Promise.allSettled(symbols.map(yahooChart));

  const payload: Record<string, unknown> = {};
  for (let i = 0; i < symbols.length; i++) {
    const r = results[i];
    payload[symbols[i]] = r.status === "fulfilled" ? r.value : { error: r.reason?.message ?? String(r.reason) };
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const config = { runtime: "edge" };
