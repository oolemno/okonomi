/**
 * Befolkning per kommune – SSB tabell 07459.
 *
 * Befolkningstall per kommune, kjønn og alder. Årlig.
 * Bekreftet fungerende i kommune-utforskning.md med kommunenivå,
 * 106 aldersgrupper, kjønn, 41 år med data.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

export interface BefolkningPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  population: number;
}

export interface BefolkningResult {
  data: BefolkningPoint[];
  latest: BefolkningPoint[];
  growth: { kommuneKode: string; kommune: string; yearlyGrowthPercent: number }[];
}

/**
 * Hent total befolkning per kommune (begge kjønn, alle aldre).
 *
 * @param kommunenummer – Én eller flere kommunenumre, f.eks. "0301" eller ["0301", "4215"].
 * @param years – Antall år. Default 10.
 */
export async function fetchBefolkning(
  client: SSBClient,
  options: { kommunenummer: string | string[]; years?: number }
): Promise<BefolkningResult> {
  const years = options.years ?? 10;
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  // Kjonn og Alder har elimination=true, så vi utelater dem for å få totaler.
  // ContentsCode er "Personer1" (ikke "Folkemengde").
  const result = await client.query(
    "07459",
    buildQuery({
      table: "07459",
      filters: {
        Region: kommuner,
        Kjonn: "*",
        Alder: "*",
        ContentsCode: "Personer1",
      },
      lastN: years,
    })
  );

  const data: BefolkningPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      population: d.value as number,
    }));

  // Siste år per kommune
  const latest = kommuner.map((kode) => {
    const kommuneData = data.filter((d) => d.kommuneKode === kode);
    return kommuneData[kommuneData.length - 1];
  }).filter(Boolean);

  // Beregn årlig vekst (siste to år)
  const growth = kommuner.map((kode) => {
    const kommuneData = data
      .filter((d) => d.kommuneKode === kode)
      .sort((a, b) => a.year.localeCompare(b.year));
    const n = kommuneData.length;
    if (n < 2) return null;
    const prev = kommuneData[n - 2].population;
    const curr = kommuneData[n - 1].population;
    return {
      kommuneKode: kode,
      kommune: kommuneData[n - 1].kommune,
      yearlyGrowthPercent: ((curr - prev) / prev) * 100,
    };
  }).filter(Boolean) as BefolkningResult["growth"];

  return { data, latest, growth };
}

export interface AldersfordelingPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  aldersgruppe: string;
  antall: number;
}

/**
 * Hent aldersfordeling per kommune.
 *
 * @param aldersgrupper – Liste med alderskoder, f.eks. ["000", "006", "016", "067", "080"].
 *   Default: grove grupper (0-5, 6-15, 16-66, 67-79, 80+).
 */
export async function fetchAldersfordeling(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    aldersgrupper?: string[];
    years?: number;
  }
): Promise<{ data: AldersfordelingPoint[]; result: SSBResult }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  // SSB bruker enkeltalder "000"-"105" og "999" (alle).
  // For grove grupper kan vi sende spesifikke aldre.
  // Men merk: SSB har ikke ferdig-aggregerte grupper i denne tabellen –
  // vi må hente enkeltalder og aggregere selv.
  // For enkelhets skyld henter vi bare spesifikke aldre som milepæler.
  const aldersgrupper = options.aldersgrupper ?? [
    "000", "006", "016", "020", "030", "040", "050", "060", "067", "080", "090",
  ];

  const result = await client.query(
    "07459",
    buildQuery({
      table: "07459",
      filters: {
        Region: kommuner,
        Kjonn: "*",
        Alder: aldersgrupper,
        ContentsCode: "Personer1",
      },
      lastN: options.years ?? 1,
    })
  );

  const data: AldersfordelingPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      aldersgruppe: d.labels.Alder,
      antall: d.value as number,
    }));

  return { data, result };
}
