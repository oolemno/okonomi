/**
 * Filbasert cache for SSB-data.
 *
 * SSB oppdaterer data sjelden (månedlig/kvartalsvis), så aggressiv caching
 * er fornuftig. Lagrer JSON-filer i en cache-mappe med TTL-sjekk.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SSBQuery, CacheEntry, SSBDataPoint } from "./types.js";

export class SSBCache {
  private cacheDir: string;
  private defaultTtl: number;

  constructor(cacheDir: string, defaultTtl: number) {
    this.cacheDir = cacheDir;
    this.defaultTtl = defaultTtl;
  }

  /** Generér en deterministisk cache-nøkkel fra tabell + query. */
  private getCacheKey(tableId: string, query: SSBQuery): string {
    const payload = JSON.stringify({ tableId, query });
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  private getFilePath(key: string): string {
    return join(this.cacheDir, `${key}.json`);
  }

  /** Opprett cache-mappen hvis den ikke finnes. */
  private async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /** Hent fra cache hvis gyldig. Returnerer null hvis utløpt eller ikke funnet. */
  async get(
    tableId: string,
    query: SSBQuery
  ): Promise<{ data: SSBDataPoint[]; label: string; dimensions: string[] } | null> {
    const key = this.getCacheKey(tableId, query);
    const filePath = this.getFilePath(key);

    try {
      const raw = await readFile(filePath, "utf-8");
      const entry: CacheEntry = JSON.parse(raw);

      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        return null; // Utløpt
      }

      return {
        data: entry.data,
        label: entry.label,
        dimensions: entry.dimensions,
      };
    } catch {
      return null; // Fil finnes ikke eller er korrupt
    }
  }

  /** Lagre resultat i cache. */
  async set(
    tableId: string,
    query: SSBQuery,
    result: { data: SSBDataPoint[]; label: string; dimensions: string[] }
  ): Promise<void> {
    await this.ensureDir();

    const key = this.getCacheKey(tableId, query);
    const entry: CacheEntry = {
      tableId,
      queryHash: key,
      timestamp: Date.now(),
      ttl: this.defaultTtl,
      data: result.data,
      label: result.label,
      dimensions: result.dimensions,
    };

    await writeFile(this.getFilePath(key), JSON.stringify(entry), "utf-8");
  }

  /** Slett all cache. */
  async clear(): Promise<void> {
    try {
      const files = await readdir(this.cacheDir);
      await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map((f) => unlink(join(this.cacheDir, f)))
      );
    } catch {
      // Mappen finnes kanskje ikke ennå – helt greit
    }
  }

  /** Slett utløpte cache-filer. */
  async prune(): Promise<number> {
    let pruned = 0;
    try {
      const files = await readdir(this.cacheDir);
      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const filePath = join(this.cacheDir, file);
        try {
          const raw = await readFile(filePath, "utf-8");
          const entry: CacheEntry = JSON.parse(raw);
          if (Date.now() - entry.timestamp > entry.ttl) {
            await unlink(filePath);
            pruned++;
          }
        } catch {
          // Korrupt fil – slett den
          await unlink(filePath);
          pruned++;
        }
      }
    } catch {
      // Mappen finnes ikke
    }
    return pruned;
  }
}
