/**
 * Befolkningsfremskriving – SSB tabell 13600.
 *
 * Fremskriving til 2050 med 9 ulike scenarioer. Kommunenivå.
 * Bekreftet fungerende i kommune-utforskning.md.
 *
 * NB: Scenarioer er kodet som ulike ContentsCode-verdier:
 *   "Personer" = Hovedalternativ (MMMM)
 *   "Personer1" = Lav vekst (LLML)
 *   "Personer2" = Høy vekst (HHMH)
 *   osv.
 *
 * Kjonn og Alder har elimination=true, så vi utelater dem for totaler.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface FramskrivingPoint {
  year: string;
  kommune: string;
  kommuneKode: string;
  scenario: string;
  scenarioKode: string;
  population: number;
}

export interface FramskrivingResult {
  data: FramskrivingPoint[];
  /** Hovedalternativ (MMMM) for enkel tilgang. */
  hovedalternativ: FramskrivingPoint[];
}

/**
 * Hent befolkningsfremskriving for kommuner.
 *
 * @param scenario – ContentsCode-verdier for scenarioer.
 *   Default "Personer" (hovedalternativet MMMM).
 *   Bruk ["Personer", "Personer1", "Personer2"] for hoved + lav + høy.
 */
export async function fetchBefolkningFramskriving(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    scenario?: string | string[];
    years?: number;
  }
): Promise<FramskrivingResult> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];
  const scenarios = options.scenario
    ? Array.isArray(options.scenario)
      ? options.scenario
      : [options.scenario]
    : ["Personer"];

  const result = await client.query(
    "13600",
    buildQuery({
      table: "13600",
      filters: {
        Region: kommuner,
        Kjonn: "*",
        Alder: "*",
        ContentsCode: scenarios,
      },
      lastN: options.years ?? 25,
    })
  );

  const data: FramskrivingPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      year: d.codes.Tid,
      kommune: d.labels.Region,
      kommuneKode: d.codes.Region,
      scenario: d.labels.ContentsCode,
      scenarioKode: d.codes.ContentsCode,
      population: d.value as number,
    }));

  const hovedalternativ = data.filter((d) => d.scenarioKode === "Personer");

  return { data, hovedalternativ };
}
