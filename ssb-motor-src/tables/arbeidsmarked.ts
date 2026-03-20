/**
 * Arbeidsledighet (AKU) – SSB tabell 05111.
 *
 * Arbeidskraftundersøkelsen, glidende 3-måneders gjennomsnitt.
 * Bekreftet fungerende i økonomi-utforskning.md.
 * For kommunenivå: bruk tabell 10540 (se fetchArbeidsledighetKommune).
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface ArbeidsledighetPoint {
  period: string;
  ledighetsrate: number;
}

export interface ArbeidsledighetResult {
  data: ArbeidsledighetPoint[];
  latest: ArbeidsledighetPoint;
}

/**
 * Hent nasjonal arbeidsledighet fra AKU (tabell 05111).
 *
 * @param periods – Antall perioder. Default 12.
 */
export async function fetchArbeidsledighet(
  client: SSBClient,
  options?: { periods?: number }
): Promise<ArbeidsledighetResult> {
  const periods = options?.periods ?? 12;

  // ArbStyrkStatus "2" = Arbeidsledige, Kjonn "0" = Begge, Alder "15-74"
  const result = await client.query(
    "05111",
    buildQuery({
      table: "05111",
      filters: {
        ArbStyrkStatus: "2",
        Kjonn: "0",
        Alder: "15-74",
        ContentsCode: "Prosent",
      },
      lastN: periods,
    })
  );

  const data: ArbeidsledighetPoint[] = result
    .asTimeSeries()
    .map((s) => ({
      period: s.time,
      ledighetsrate: s.value,
    }));

  return {
    data,
    latest: data[data.length - 1],
  };
}

export interface ArbeidsledighetKommunePoint {
  period: string;
  kommune: string;
  kommuneKode: string;
  ledighetsrate: number;
}

/**
 * Hent arbeidsledighet per kommune (tabell 10540).
 * Bekreftet fungerende i kommune-utforskning.md.
 *
 * @param kommunenummer – Én eller flere kommunenumre.
 * @param periods – Antall perioder (månedlig). Default 12.
 */
export async function fetchArbeidsledighetKommune(
  client: SSBClient,
  options: { kommunenummer: string | string[]; periods?: number }
): Promise<{ data: ArbeidsledighetKommunePoint[]; latest: ArbeidsledighetKommunePoint[] }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const result = await client.query(
    "10540",
    buildQuery({
      table: "10540",
      filters: {
        Region: kommuner,
        Alder: "15-74",
        ContentsCode: "RegHeltLedige",
      },
      lastN: options.periods ?? 12,
    })
  );

  const data: ArbeidsledighetKommunePoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      period: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      ledighetsrate: d.value as number,
    }));

  // Siste periode per kommune
  const latest = kommuner.map((kode) => {
    const kommuneData = data
      .filter((d) => d.kommuneKode === kode)
      .sort((a, b) => a.period.localeCompare(b.period));
    return kommuneData[kommuneData.length - 1];
  }).filter(Boolean);

  return { data, latest };
}
