/**
 * Deklarativ query-bygger for SSB API.
 *
 * SSBs POST-format er verbose og feilutsatt. Denne modulen lar deg
 * definere spørringer med et enklere, deklarativt grensesnitt.
 */

import type { SSBQuery, SSBQueryDef, SSBQueryVariable } from "./types.js";

/**
 * Bygg en SSB API-query fra en deklarativ definisjon.
 *
 * Eksempel:
 * ```ts
 * buildQuery({
 *   table: "07241",
 *   filters: {
 *     Boligtype: "00",
 *     ContentsCode: "KvPris",
 *   },
 *   lastN: 8,
 * })
 * ```
 */
export function buildQuery(def: SSBQueryDef): SSBQuery {
  const variables: SSBQueryVariable[] = [];

  for (const [code, value] of Object.entries(def.filters)) {
    if (value === "*") {
      // Wildcard – ikke legg til filter (SSB returnerer alle verdier)
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    variables.push({
      code,
      selection: { filter: "item", values },
    });
  }

  // Tidsfilter – enten lastN ("top") eller spesifikk periode
  if (def.lastN != null) {
    variables.push({
      code: "Tid",
      selection: { filter: "top", values: [String(def.lastN)] },
    });
  } else if (def.timeFilter) {
    // Generer verdier mellom from og to.
    // SSB bruker formater som "2024", "2024K1", "2024M01" – vi stoler
    // på at brukeren sender riktig format og legger inn en item-filter.
    variables.push({
      code: "Tid",
      selection: {
        filter: "item",
        values: [def.timeFilter.from, def.timeFilter.to],
      },
    });
  }

  return {
    query: variables,
    response: { format: "json-stat2" },
  };
}
