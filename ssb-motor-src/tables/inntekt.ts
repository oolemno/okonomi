/**
 * Medianinntekt per kommune – SSB tabell 06944.
 *
 * Samlet inntekt og inntekt etter skatt, median og gjennomsnitt,
 * per kommune og husholdningstype.
 * Bekreftet fungerende i kommune-utforskning.md.
 * Eksempel: Oslo 834 500 kr, Lillesand 910 600 kr (2024).
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface InntektPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  type: string;
  typeKode: string;
  value: number;
}

export interface InntektResult {
  data: InntektPoint[];
  latest: {
    kommuneKode: string;
    kommune: string;
    year: string;
    samletInntektMedian: number | null;
    etterSkattMedian: number | null;
  }[];
}

/**
 * Hent medianinntekt per kommune.
 *
 * @param husholdningstype – Default "0" (alle husholdninger).
 * @param years – Antall år. Default 5.
 */
export async function fetchMedianInntekt(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    husholdningstype?: string;
    years?: number;
  }
): Promise<InntektResult> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const result = await client.query(
    "06944",
    buildQuery({
      table: "06944",
      filters: {
        Region: kommuner,
        HusholdType: options.husholdningstype ?? "0000",
        ContentsCode: "*",
      },
      lastN: options.years ?? 5,
    })
  );

  const data: InntektPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      type: d.labels.ContentsCode,
      typeKode: d.codes.ContentsCode,
      value: d.value as number,
    }));

  // Siste år per kommune – plukk ut nøkkeltall
  const latest = kommuner.map((kode) => {
    const kommuneData = data.filter((d) => d.kommuneKode === kode);
    const years = [...new Set(kommuneData.map((d) => d.year))].sort();
    const lastYear = years[years.length - 1];
    const lastYearData = kommuneData.filter((d) => d.year === lastYear);

    const find = (pattern: string) =>
      lastYearData.find((d) =>
        d.typeKode.toLowerCase().includes(pattern.toLowerCase()) ||
        d.type.toLowerCase().includes(pattern.toLowerCase())
      )?.value ?? null;

    return {
      kommuneKode: kode,
      kommune: lastYearData[0]?.kommune ?? kode,
      year: lastYear,
      samletInntektMedian: find("median") ?? find("Medianinntekt"),
      etterSkattMedian: find("EtterSkatt") ?? find("etter skatt"),
    };
  });

  return { data, latest };
}
