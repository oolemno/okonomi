/**
 * KPI / inflasjon – SSB tabell 03013.
 *
 * Konsumprisindeksen, totalindeks. Månedlig oppdatering.
 * Variabelkoder bekreftet i økonomi-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface KPIPoint {
  month: string;
  index: number;
  yearlyChange: number | null;
}

export interface KPIResult {
  data: KPIPoint[];
  latest: KPIPoint;
}

/**
 * Hent KPI totalindeks med årlig endring.
 *
 * @param months – Antall måneder å returnere (default 12). Henter alltid
 *   12 ekstra måneder for å kunne beregne årlig endring.
 */
export async function fetchKPI(
  client: SSBClient,
  options?: { months?: number }
): Promise<KPIResult> {
  const outputMonths = options?.months ?? 12;
  // Hent 12 ekstra for å beregne 12-måneders endring
  const fetchMonths = outputMonths + 12;

  const result = await client.query(
    "03013",
    buildQuery({
      table: "03013",
      filters: {
        Konsumgrp: "TOTAL",
        ContentsCode: "KpiIndMnd",
      },
      lastN: fetchMonths,
    })
  );

  const series = result.asTimeSeries();

  // Bygg map for oppslag 12 måneder tilbake
  const valueByTime = new Map(series.map((s) => [s.time, s.value]));

  const data: KPIPoint[] = [];
  for (const point of series) {
    // Beregn tidsperiode 12 måneder tilbake
    const prevTime = shiftMonth(point.time, -12);
    const prevValue = valueByTime.get(prevTime);
    const yearlyChange =
      prevValue != null
        ? ((point.value - prevValue) / prevValue) * 100
        : null;

    data.push({
      month: point.time,
      index: point.value,
      yearlyChange,
    });
  }

  // Returner bare de siste outputMonths
  const output = data.slice(-outputMonths);

  return {
    data: output,
    latest: output[output.length - 1],
  };
}

/** Flytt en SSB-månedsperiode (f.eks. "2025M06") med N måneder. */
function shiftMonth(period: string, months: number): string {
  const match = period.match(/^(\d{4})M(\d{2})$/);
  if (!match) return period;

  let year = parseInt(match[1]);
  let month = parseInt(match[2]) + months;

  while (month > 12) {
    month -= 12;
    year++;
  }
  while (month < 1) {
    month += 12;
    year--;
  }

  return `${year}M${String(month).padStart(2, "0")}`;
}
