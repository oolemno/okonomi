/**
 * SSB Motor – gjenbrukbar dataplattform for SSB.
 *
 * Bruk:
 * ```ts
 * import { SSBClient, fetchKPI, fetchBefolkning } from "ssb-motor";
 *
 * const client = new SSBClient({ verbose: true });
 * const kpi = await fetchKPI(client);
 * ```
 */

// Kjernekomponenter
export { SSBClient } from "./client.js";
export { SSBResult, parseJsonStat2 } from "./parser.js";
export { buildQuery } from "./query-builder.js";
export { SSBCache } from "./cache.js";

// Typer
export type {
  SSBClientConfig,
  SSBQuery,
  SSBQueryDef,
  SSBQueryVariable,
  SSBTableMetadata,
  SSBVariableMetadata,
  SSBDataPoint,
  TimeSeriesPoint,
  JsonStat2Response,
  CacheEntry,
} from "./types.js";

// Ferdige tabelldefinisjoner
export {
  // Økonomi
  fetchKPI,
  fetchBoligpris,
  fetchArbeidsledighet,
  fetchArbeidsledighetKommune,
  fetchLonnsvekst,
  // Kommune
  fetchBefolkning,
  fetchAldersfordeling,
  fetchBefolkningFramskriving,
  fetchFlytting,
  fetchMedianInntekt,
  fetchKOSTRA,
  fetchKOSTRAUtgifter,
  fetchKommunaleGebyrer,
  fetchNaringsstruktur,
  fetchArealbruk,
  fetchBoligbygging,
  fetchKjoretoy,
  fetchBarnehage,
  fetchInnvandring,
  fetchPendling,
} from "./tables/index.js";

// Tabelltyper
export type {
  KPIPoint,
  KPIResult,
  BoligprisPoint,
  BoligprisResult,
  ArbeidsledighetPoint,
  ArbeidsledighetResult,
  ArbeidsledighetKommunePoint,
  LonnPoint,
  LonnResult,
  BefolkningPoint,
  BefolkningResult,
  AldersfordelingPoint,
  FramskrivingPoint,
  FramskrivingResult,
  FlyttingPoint,
  FlyttingResult,
  InntektPoint,
  InntektResult,
  KOSTRAUtgifterPoint,
  KommunaleGebyrerResult,
  NaringsstrukturPoint,
  NaringsstrukturResult,
  ArealbrukPoint,
  BoligbyggingPoint,
  KjoretoyPoint,
} from "./tables/index.js";
