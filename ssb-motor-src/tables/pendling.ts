/**
 * Pendlerstrømmer – SSB tabell 03321.
 *
 * Kryssmatrise bostedskommune × arbeidsstedskommune.
 * Bekreftet fungerende i kommune-utforskning.md.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";
import { SSBResult } from "../parser.js";

/**
 * Hent pendlerdata for en kommune (som bosted).
 */
export async function fetchPendling(
  client: SSBClient,
  options: {
    bostedskommune: string | string[];
    arbeidsstedskommune?: string | string[];
    years?: number;
  }
): Promise<{ result: SSBResult }> {
  const bosted = Array.isArray(options.bostedskommune)
    ? options.bostedskommune
    : [options.bostedskommune];

  const filters: Record<string, string | string[]> = {
    Bokommuen: bosted,
    ContentsCode: "Sysselsatte",
  };

  if (options.arbeidsstedskommune) {
    filters.ArbstedKomm = Array.isArray(options.arbeidsstedskommune)
      ? options.arbeidsstedskommune
      : [options.arbeidsstedskommune];
  }

  const result = await client.query(
    "03321",
    buildQuery({
      table: "03321",
      filters,
      lastN: options.years ?? 1,
    })
  );

  return { result };
}
