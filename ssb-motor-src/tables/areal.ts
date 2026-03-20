/**
 * Arealbruk per kommune – SSB tabell 09594.
 *
 * 98 arealklasser per kommune. Bekreftet fungerende i kommune-utforskning.md.
 * Eksempel: Oslo boligbebyggelse 50.56 km², Lillesand 3.58 km².
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

export interface ArealbrukPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  arealtype: string;
  arealtypeKode: string;
  km2: number;
}

/**
 * Hent arealbruk per kommune.
 *
 * @param arealtype – Arealtypekoder. Default "*" (alle).
 */
export async function fetchArealbruk(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    arealtype?: string | string[];
    years?: number;
  }
): Promise<{ data: ArealbrukPoint[]; result: SSBResult }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    Region: kommuner,
    ContentsCode: "Areal",
  };

  if (options.arealtype) filters.ArealKlasse = options.arealtype;

  const result = await client.query(
    "09594",
    buildQuery({
      table: "09594",
      filters,
      lastN: options.years ?? 1,
    })
  );

  const data: ArealbrukPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      arealtype: d.labels.ArealKlasse,
      arealtypeKode: d.codes.ArealKlasse,
      km2: d.value as number,
    }));

  return { data, result };
}
