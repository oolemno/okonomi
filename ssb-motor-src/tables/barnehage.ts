/**
 * Barnehagedekning – SSB tabell 12272 (KOSTRA barnehage).
 *
 * Barn i barnehage per kommune, inkl. minoritetsspråklige.
 * Bekreftet fungerende i kommune-utforskning.md.
 * Eksempel: Oslo 34 505 barn, Lillesand 523.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

/**
 * Hent barnehagedata per kommune.
 */
export async function fetchBarnehage(
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
    "12272",
    buildQuery({
      table: "12272",
      filters: {
        KOKkommuneregion0000: kommuner,
        ContentsCode: "*",
      },
      lastN: options.years ?? 3,
    })
  );

  return { result };
}
