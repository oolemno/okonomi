/**
 * Flytting inn/ut per kommune – SSB tabell 09588.
 *
 * 12 underkategorier inkl. innenlands/utenlands, netto per 1000.
 * Bekreftet fungerende i kommune-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface FlyttingPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  type: string;
  typeKode: string;
  value: number;
}

export interface FlyttingResult {
  data: FlyttingPoint[];
  /** Siste års nøkkeltall per kommune. */
  summary: {
    kommuneKode: string;
    kommune: string;
    year: string;
    values: Record<string, number>;
  }[];
}

/**
 * Hent flyttedata per kommune.
 *
 * @param years – Antall år. Default 5.
 */
export async function fetchFlytting(
  client: SSBClient,
  options: { kommunenummer: string | string[]; years?: number }
): Promise<FlyttingResult> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const result = await client.query(
    "09588",
    buildQuery({
      table: "09588",
      filters: {
        Region: kommuner,
        ContentsCode: "*",
      },
      lastN: options.years ?? 5,
    })
  );

  const data: FlyttingPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      type: d.labels.ContentsCode,
      typeKode: d.codes.ContentsCode,
      value: d.value as number,
    }));

  // Sammendrag: siste år per kommune
  const summary = kommuner.map((kode) => {
    const kommuneData = data.filter((d) => d.kommuneKode === kode);
    const years = [...new Set(kommuneData.map((d) => d.year))].sort();
    const lastYear = years[years.length - 1];
    const lastYearData = kommuneData.filter((d) => d.year === lastYear);

    const values: Record<string, number> = {};
    for (const d of lastYearData) {
      values[d.type] = d.value;
    }

    return {
      kommuneKode: kode,
      kommune: lastYearData[0]?.kommune ?? kode,
      year: lastYear,
      values,
    };
  });

  return { data, summary };
}
