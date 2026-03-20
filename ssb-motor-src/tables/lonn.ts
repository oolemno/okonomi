/**
 * Lønnsnivå – SSB tabell 11418.
 *
 * Gjennomsnittlig månedslønn, årlig. Bekreftet fungerende i økonomi-utforskning.md.
 * Eksempelverdi: 62 070 kr (2025).
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface LonnPoint {
  year: string;
  manedslonn: number;
}

export interface LonnResult {
  data: LonnPoint[];
  latest: LonnPoint;
  yearlyGrowthPercent: number | null;
}

/**
 * Hent gjennomsnittlig månedslønn (nasjonal, alle næringer).
 *
 * @param years – Antall år. Default 10.
 */
export async function fetchLonnsvekst(
  client: SSBClient,
  options?: { years?: number }
): Promise<LonnResult> {
  const years = options?.years ?? 10;

  const result = await client.query(
    "11418",
    buildQuery({
      table: "11418",
      filters: {
        Sektor: "ALLE",
        MaaleMetode: "02", // Gjennomsnitt
        Yrke: "0-9", // Alle yrker
        ContentsCode: "Manedslonn",
      },
      lastN: years,
    })
  );

  const series = result.asTimeSeries();
  const data: LonnPoint[] = series.map((s) => ({
    year: s.time,
    manedslonn: s.value,
  }));

  const n = data.length;
  const yearlyGrowthPercent =
    n >= 2
      ? ((data[n - 1].manedslonn - data[n - 2].manedslonn) /
          data[n - 2].manedslonn) *
        100
      : null;

  return {
    data,
    latest: data[n - 1],
    yearlyGrowthPercent,
  };
}
