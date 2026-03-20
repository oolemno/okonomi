/**
 * Boligprisindeks – SSB tabell 07241.
 *
 * Kvartalsvis kvm-pris. NB: Tabell 07241 har IKKE region-dimensjon
 * (bekreftet i utforskningsrapportene). Gir kun nasjonale tall per boligtype.
 */

import type { SSBClient } from "../client.js";
import { buildQuery } from "../query-builder.js";

export interface BoligprisPoint {
  quarter: string;
  boligtype: string;
  boligtypeKode: string;
  kvmpris: number;
}

export interface BoligprisResult {
  data: BoligprisPoint[];
  latest: BoligprisPoint;
}

/**
 * Hent nasjonal boligprisindeks (kvm-pris) per boligtype.
 *
 * @param boligtype – Boligtypekode: "00" (alle), "02" (småhus), "03" (blokk). Default "00".
 * @param quarters – Antall kvartaler. Default 8.
 */
export async function fetchBoligpris(
  client: SSBClient,
  options?: { boligtype?: string; quarters?: number }
): Promise<BoligprisResult> {
  const boligtype = options?.boligtype ?? "00";
  const quarters = options?.quarters ?? 8;

  const result = await client.query(
    "07241",
    buildQuery({
      table: "07241",
      filters: {
        Boligtype: boligtype,
        ContentsCode: "KvPris",
      },
      lastN: quarters,
    })
  );

  const data: BoligprisPoint[] = result.data
    .filter((d) => d.value != null)
    .map((d) => ({
      quarter: d.codes.Tid,
      boligtype: d.labels.Boligtype,
      boligtypeKode: d.codes.Boligtype,
      kvmpris: d.value as number,
    }));

  return {
    data,
    latest: data[data.length - 1],
  };
}

// TODO: For regionale boligpriser, undersøk SSB tabell 13655 eller 06035.
// Tabell 07241 har kun nasjonale tall (bekreftet i eiendom-utforskning.md og
// kommune-utforskning.md).
