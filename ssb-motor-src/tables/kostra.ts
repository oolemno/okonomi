/**
 * KOSTRA kommuneøkonomi – SSB tabeller 12362 og 12367.
 *
 * Tabell 12362: Nøkkeltall (driftsresultat, lånegjeld, frie inntekter).
 *   97 funksjoner × 5 arter × 3 statistikkvariabler.
 *
 * Tabell 12367: Korrigerte brutto driftsutgifter per tjenesteområde.
 *
 * Tabell 12842: Kommunale gebyrer (avfall, avløp).
 *
 * Alle bekreftet fungerende i kommune-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

// ─── Tabell 12362: Kommuneøkonomi nøkkeltall ────────────────────

/**
 * Hent KOSTRA nøkkeltall fra tabell 12362.
 * Returnerer rå SSBResult for fleksibilitet – denne tabellen har
 * mange funksjon/art-kombinasjoner.
 *
 * For spesifikke nøkkeltall, bruk hjelpe-funksjoner nedenfor.
 */
export async function fetchKOSTRA(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    funksjon?: string | string[];
    art?: string | string[];
    statistikkvariabel?: string | string[];
    years?: number;
  }
): Promise<SSBResult> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    KOKkommuneregion0000: kommuner,
  };

  if (options.funksjon) filters.KOKfunksjon0000 = options.funksjon;
  if (options.art) filters.KOKart0000 = options.art;
  if (options.statistikkvariabel) filters.ContentsCode = options.statistikkvariabel;

  return client.query(
    "12362",
    buildQuery({
      table: "12362",
      filters,
      lastN: options.years ?? 3,
    })
  );
}

// ─── Tabell 12367: Utgifter per sektor ──────────────────────────

export interface KOSTRAUtgifterPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  funksjon: string;
  funksjonKode: string;
  verdi: number;
}

/**
 * Hent korrigerte brutto driftsutgifter per tjenesteområde (tabell 12367).
 */
export async function fetchKOSTRAUtgifter(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    funksjon?: string | string[];
    years?: number;
  }
): Promise<{ data: KOSTRAUtgifterPoint[]; result: SSBResult }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    KOKkommuneregion0000: kommuner,
    KOKregnskapsomfa0000: "A", // Konsern
    KOKart0000: "AGD4", // Korrigerte brutto driftsutgifter
    ContentsCode: "KOSbelop0000",
  };

  if (options.funksjon) filters.KOKfunksjon0000 = options.funksjon;

  const result = await client.query(
    "12367",
    buildQuery({
      table: "12367",
      filters,
      lastN: options.years ?? 3,
    })
  );

  const data: KOSTRAUtgifterPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.KOKkommuneregion0000,
      kommuneKode: d.codes.KOKkommuneregion0000,
      funksjon: d.labels.KOKfunksjon0000,
      funksjonKode: d.codes.KOKfunksjon0000,
      verdi: d.value as number,
    }));

  return { data, result };
}

// ─── Tabell 12842: Kommunale gebyrer ────────────────────────────

export interface KommunaleGebyrerResult {
  kommune: string;
  kommuneKode: string;
  year: string;
  gebyrer: Record<string, number>;
}

/**
 * Hent kommunale gebyrer (avfall, avløp, etc.) fra tabell 12842.
 */
export async function fetchKommunaleGebyrer(
  client: SSBClient,
  options: { kommunenummer: string | string[]; years?: number }
): Promise<KommunaleGebyrerResult[]> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const result = await client.query(
    "12842",
    buildQuery({
      table: "12842",
      filters: {
        KOKkommuneregion0000: kommuner,
      },
      lastN: options.years ?? 1,
    })
  );

  // Grupper etter kommune og tid
  const grouped = result.groupBy("KOKkommuneregion0000");
  const results: KommunaleGebyrerResult[] = [];

  for (const [kommuneKode, kommuneResult] of Object.entries(grouped)) {
    const byYear = kommuneResult.groupBy("Tid");
    for (const [year, yearResult] of Object.entries(byYear)) {
      const gebyrer: Record<string, number> = {};
      for (const d of yearResult.data) {
        if (d.value != null) {
          const label = d.labels.ContentsCode ?? d.codes.ContentsCode;
          gebyrer[label] = d.value;
        }
      }
      results.push({
        kommune: yearResult.data[0]?.labels.KOKkommuneregion0000 ?? kommuneKode,
        kommuneKode,
        year,
        gebyrer,
      });
    }
  }

  return results;
}
