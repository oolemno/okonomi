/**
 * SSB API-klient med rate limiting, caching og feilhåndtering.
 *
 * Brukes som hovedinngangspunkt for all kommunikasjon med SSB.
 */

import type {
  SSBClientConfig,
  SSBQuery,
  SSBTableMetadata,
  JsonStat2Response,
} from "./types.js";
import { SSBCache } from "./cache.js";
import { SSBResult, parseJsonStat2 } from "./parser.js";

const DEFAULT_BASE_URL = "https://data.ssb.no/api/v0/no/table";
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 timer
const DEFAULT_CACHE_DIR = ".ssb-cache";
const DEFAULT_RATE_LIMIT_MS = 1000;
const DEFAULT_TIMEOUT = 15000;

export class SSBClient {
  private baseUrl: string;
  private rateLimitMs: number;
  private timeout: number;
  private verbose: boolean;
  private cache: SSBCache;
  private lastCallTimestamp = 0;

  constructor(config?: SSBClientConfig) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.rateLimitMs = config?.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
    this.verbose = config?.verbose ?? false;
    this.cache = new SSBCache(
      config?.cacheDir ?? DEFAULT_CACHE_DIR,
      config?.cacheDuration ?? DEFAULT_CACHE_DURATION
    );
  }

  /** Vent til rate limit er overholdt. */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTimestamp;
    if (elapsed < this.rateLimitMs) {
      const waitMs = this.rateLimitMs - elapsed;
      if (this.verbose) {
        console.log(`  ⏳ Rate limit: venter ${waitMs}ms`);
      }
      await new Promise((r) => setTimeout(r, waitMs));
    }
    this.lastCallTimestamp = Date.now();
  }

  private log(msg: string): void {
    if (this.verbose) console.log(`[SSB] ${msg}`);
  }

  /**
   * Hent metadata for en SSB-tabell (GET).
   * Returnerer tilgjengelige variabler med alle lovlige verdier.
   */
  async getTableMetadata(tableId: string): Promise<SSBTableMetadata> {
    await this.waitForRateLimit();

    const url = `${this.baseUrl}/${tableId}`;
    this.log(`GET metadata: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(
          `SSB metadata feilet for tabell ${tableId}: HTTP ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      return {
        title: json.title,
        variables: json.variables.map((v: any) => ({
          code: v.code,
          text: v.text,
          values: v.values,
          valueTexts: v.valueTexts,
          elimination: v.elimination,
          time: v.time,
        })),
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(
          `SSB metadata timeout (${this.timeout}ms) for tabell ${tableId}`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Kjør en query mot SSB (POST). Sjekker cache først,
   * og cacher resultatet ved suksess.
   */
  async query(tableId: string, query: SSBQuery): Promise<SSBResult> {
    // Sjekk cache
    const cached = await this.cache.get(tableId, query);
    if (cached) {
      this.log(`Cache treff for tabell ${tableId}`);
      return new SSBResult(cached.label, cached.dimensions, cached.data);
    }

    // Hent fra API
    const result = await this.fetchFromAPI(tableId, query);

    // Lagre i cache
    await this.cache.set(tableId, query, {
      data: result.data,
      label: result.label,
      dimensions: result.dimensions,
    });

    return result;
  }

  /** Hent data direkte fra SSB API uten cache. */
  private async fetchFromAPI(
    tableId: string,
    query: SSBQuery,
    isRetry = false
  ): Promise<SSBResult> {
    await this.waitForRateLimit();

    const url = `${this.baseUrl}/${tableId}`;
    const body = JSON.stringify(query);
    this.log(`POST ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });

      if (res.status === 403 && !isRetry) {
        // Rate limit – vent og prøv én gang til
        this.log("403 – rate limit? Venter 5 sekunder og prøver igjen...");
        await new Promise((r) => setTimeout(r, 5000));
        this.lastCallTimestamp = Date.now();
        return this.fetchFromAPI(tableId, query, true);
      }

      if (res.status === 400) {
        const errorText = await res.text();
        throw new Error(
          `SSB query feilet for tabell ${tableId} (400 Bad Request).\n` +
            `Query: ${body}\n` +
            `Respons: ${errorText}`
        );
      }

      if (!res.ok) {
        throw new Error(
          `SSB feil for tabell ${tableId}: HTTP ${res.status} ${res.statusText}`
        );
      }

      const json: JsonStat2Response = await res.json();
      return parseJsonStat2(json);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Ved timeout: sjekk om vi har gammel cache
        const stale = await this.cache.get(tableId, query);
        if (stale) {
          this.log(
            `Timeout for tabell ${tableId}, bruker cachet data (kan være utdatert)`
          );
          return new SSBResult(stale.label, stale.dimensions, stale.data);
        }
        throw new Error(
          `SSB timeout (${this.timeout}ms) for tabell ${tableId}.\n` +
            `Query: ${body}`
        );
      }

      // Nettverksfeil – prøv cache
      if (
        err.message?.includes("fetch failed") ||
        err.code === "ECONNREFUSED"
      ) {
        const stale = await this.cache.get(tableId, query);
        if (stale) {
          this.log(
            `Nettverksfeil for tabell ${tableId}, bruker cachet data`
          );
          return new SSBResult(stale.label, stale.dimensions, stale.data);
        }
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Hent siste N observasjoner. Convenience-metode som overstyrer
   * tidsfilter i query med "top N".
   */
  async getLatest(
    tableId: string,
    query: SSBQuery,
    n = 1
  ): Promise<SSBResult> {
    // Fjern evt. eksisterende Tid-filter og legg til top N
    const modified: SSBQuery = {
      ...query,
      query: [
        ...query.query.filter((v) => v.code !== "Tid"),
        { code: "Tid", selection: { filter: "top", values: [String(n)] } },
      ],
    };
    return this.query(tableId, modified);
  }

  /** Tøm all cache. */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /** Fjern utløpt cache. Returnerer antall slettede filer. */
  async pruneCache(): Promise<number> {
    return this.cache.prune();
  }
}
