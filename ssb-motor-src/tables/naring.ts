/**
 * Næringsstruktur – SSB tabell 07091.
 *
 * Bedrifter per bransje (89 næringer) og størrelsesgruppe per kommune.
 * Bekreftet fungerende i kommune-utforskning.md.
 * Eksempel: Oslo 105 130 bedrifter, Lillesand 1 466 (2026).
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface NaringsstrukturPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  naring: string;
  naringKode: string;
  antall: number;
}

export interface NaringsstrukturResult {
  data: NaringsstrukturPoint[];
  totalt: { kommuneKode: string; kommune: string; year: string; antall: number }[];
}

/**
 * Hent bedrifter per bransje og kommune.
 *
 * @param naring – Næringskoder. Default "*" (alle). Bruk "00-99" for total.
 * @param storrelse – Størrelsesgruppe. Default "*" (alle).
 */
export async function fetchNaringsstruktur(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    naring?: string | string[];
    storrelse?: string;
    years?: number;
  }
): Promise<NaringsstrukturResult> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    Region: kommuner,
    NACE2007: options.naring ?? "*",
    AntAnsatte: options.storrelse ?? "99", // "99" = Alle størrelsesgrupper
    ContentsCode: "Bedrifter",
  };

  const result = await client.query(
    "07091",
    buildQuery({
      table: "07091",
      filters,
      lastN: options.years ?? 3,
    })
  );

  const data: NaringsstrukturPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      naring: d.labels.NACE2007,
      naringKode: d.codes.NACE2007,
      antall: d.value as number,
    }));

  // Total per kommune (siste år)
  const totalt = kommuner.map((kode) => {
    const kommuneData = data.filter((d) => d.kommuneKode === kode);
    const years = [...new Set(kommuneData.map((d) => d.year))].sort();
    const lastYear = years[years.length - 1];
    const total = kommuneData
      .filter((d) => d.year === lastYear)
      .reduce((sum, d) => sum + d.antall, 0);

    return {
      kommuneKode: kode,
      kommune: kommuneData[0]?.kommune ?? kode,
      year: lastYear,
      antall: total,
    };
  });

  return { data, totalt };
}
