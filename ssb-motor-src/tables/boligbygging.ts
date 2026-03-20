/**
 * Boligbygging per kommune – SSB tabell 05889.
 *
 * Kvartalsvis: godkjente, igangsatte og fullførte boliger.
 * Bekreftet fungerende i kommune-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface BoligbyggingPoint {
  quarter: string;
  kommune: string;
  kommuneKode: string;
  bygningstype: string;
  bygningstypeKode: string;
  fase: string;
  faseKode: string;
  antall: number;
}

/**
 * Hent boligbygging per kommune.
 *
 * @param quarters – Antall kvartaler. Default 8.
 */
export async function fetchBoligbygging(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    bygningstype?: string | string[];
    quarters?: number;
  }
): Promise<{ data: BoligbyggingPoint[] }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    Region: kommuner,
    ContentsCode: "*",
  };

  if (options.bygningstype) filters.Byggeareal = options.bygningstype;

  const result = await client.query(
    "05889",
    buildQuery({
      table: "05889",
      filters,
      lastN: options.quarters ?? 8,
    })
  );

  const data: BoligbyggingPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      quarter: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      bygningstype: d.labels.Byggeareal ?? "",
      bygningstypeKode: d.codes.Byggeareal ?? "",
      fase: d.labels.ContentsCode,
      faseKode: d.codes.ContentsCode,
      antall: d.value as number,
    }));

  return { data };
}
