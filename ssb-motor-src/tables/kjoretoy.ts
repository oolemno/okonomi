/**
 * Kjøretøybestand per kommune – SSB tabell 07849.
 *
 * Personbiler per drivstofftype og kommune. Kan beregne elbil-andel.
 * Bekreftet fungerende i kommune-utforskning.md.
 *
 * Variabler:
 *   Region (elimination=true), KjoringensArt (elimination=true),
 *   DrivstoffType (elimination=true), ContentsCode, Tid
 * ContentsCode: Personbil1, Ambulanse2, Buss3, Varebil4, osv.
 * DrivstoffType: 1=Bensin, 2=Diesel, 3=Parafin, 4=Gass, 5=El
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface KjoretoyPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  drivstoff: string;
  drivstoffKode: string;
  antall: number;
}

/**
 * Hent personbiler per kommune og drivstofftype.
 *
 * @param drivstoff – Drivstofftypekoder. Default "*" (alle).
 *   "1"=Bensin, "2"=Diesel, "5"=Elektrisk.
 */
export async function fetchKjoretoy(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    drivstoff?: string | string[];
    years?: number;
  }
): Promise<{ data: KjoretoyPoint[] }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const filters: Record<string, string | string[]> = {
    Region: kommuner,
    ContentsCode: "Personbil1",
  };

  if (options.drivstoff) {
    filters.DrivstoffType = options.drivstoff;
  }

  const result = await client.query(
    "07849",
    buildQuery({
      table: "07849",
      filters,
      lastN: options.years ?? 5,
    })
  );

  const data: KjoretoyPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      drivstoff: d.labels.DrivstoffType ?? "Alle",
      drivstoffKode: d.codes.DrivstoffType ?? "*",
      antall: d.value as number,
    }));

  return { data };
}
