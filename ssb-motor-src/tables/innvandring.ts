/**
 * Innvandring/landbakgrunn – SSB tabell 07110.
 *
 * Innvandrere per kommune med landbakgrunn per verdensdel.
 * Bekreftet fungerende i kommune-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

/**
 * Hent innvandrerbefolkning per kommune og landbakgrunn.
 */
export async function fetchInnvandring(
  client: SSBClient,
  options: {
    kommunenummer: string | string[];
    years?: number;
  }
): Promise<{ result: SSBResult }> {
  const kommuner = Array.isArray(options.kommunenummer)
    ? options.kommunenummer
    : [options.kommunenummer];

  const result = await client.query(
    "07110",
    buildQuery({
      table: "07110",
      filters: {
        Region: kommuner,
        Kjonn: "*",
        ContentsCode: "Personer",
      },
      lastN: options.years ?? 3,
    })
  );

  return { result };
}
