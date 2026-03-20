/**
 * SSB Motor – TypeScript-typer for SSB API-integrasjon.
 *
 * Dekker konfigurasjon, spørringer, rå json-stat2-respons og parsed resultat.
 */

// ─── Konfigurasjon ───────────────────────────────────────────────

export interface SSBClientConfig {
  /** SSB API base-URL. Default: https://data.ssb.no/api/v0/no/table */
  baseUrl?: string;
  /** Cache-varighet i millisekunder. Default: 24 timer */
  cacheDuration?: number;
  /** Mappe for filbasert cache. Default: .ssb-cache/ */
  cacheDir?: string;
  /** Minimum millisekunder mellom API-kall. Default: 1000 */
  rateLimitMs?: number;
  /** Timeout for HTTP-kall i millisekunder. Default: 15000 */
  timeout?: number;
  /** Logg API-kall til konsollen. Default: false */
  verbose?: boolean;
}

// ─── SSB Query ───────────────────────────────────────────────────

/** Et enkelt variabelfilter i en SSB-spørring. */
export interface SSBQueryVariable {
  code: string;
  selection: {
    filter: "item" | "top" | "all" | "agg";
    values: string[];
  };
}

/** Rå SSB POST-body. */
export interface SSBQuery {
  query: SSBQueryVariable[];
  response: { format: "json-stat2" };
}

/** Deklarativ query-definisjon – enklere å jobbe med enn rå SSBQuery. */
export interface SSBQueryDef {
  /** SSB-tabellnummer, f.eks. "07241" */
  table: string;
  /**
   * Variabelkode → verdi(er).
   * - Én verdi: "0301"
   * - Flere verdier: ["0301", "4215"]
   * - Alle verdier: "*"
   */
  filters: Record<string, string | string[]>;
  /** Hent siste N tidsperioder (bruker "top"-filter). */
  lastN?: number;
  /** Alternativ: spesifikk tidsperiode. */
  timeFilter?: { from: string; to: string };
}

// ─── SSB Metadata ────────────────────────────────────────────────

/** Metadata for én variabel i en SSB-tabell. */
export interface SSBVariableMetadata {
  code: string;
  text: string;
  values: string[];
  valueTexts: string[];
  elimination?: boolean;
  time?: boolean;
}

/** Metadata for en hel SSB-tabell (fra GET-kall). */
export interface SSBTableMetadata {
  title: string;
  variables: SSBVariableMetadata[];
}

// ─── json-stat2 rå respons ───────────────────────────────────────

/** Kategori-info for én dimensjon i json-stat2. */
export interface JsonStat2Category {
  index: Record<string, number> | string[];
  label: Record<string, string>;
  unit?: Record<string, { base: string; decimals: number }>;
}

/** Én dimensjon i json-stat2-respons. */
export interface JsonStat2Dimension {
  label: string;
  category: JsonStat2Category;
}

/** Rå json-stat2-respons fra SSB. */
export interface JsonStat2Response {
  class: "dataset";
  label: string;
  source: string;
  updated: string;
  id: string[];
  size: number[];
  dimension: Record<string, JsonStat2Dimension>;
  value: (number | null)[];
  role?: { time?: string[]; geo?: string[]; metric?: string[] };
  status?: Record<string, string>;
}

// ─── Parsed resultat ─────────────────────────────────────────────

/** Ett datapunkt med verdier og labels for alle dimensjoner. */
export interface SSBDataPoint {
  /** Den numeriske verdien (null = manglende data). */
  value: number | null;
  /** Lesbare labels: { Region: "Oslo", Tid: "2024K1" } */
  labels: Record<string, string>;
  /** Koder: { Region: "0301", Tid: "2024K1" } */
  codes: Record<string, string>;
}

/** Tidsseriepunkt. */
export interface TimeSeriesPoint {
  time: string;
  value: number;
}

// ─── Cache ───────────────────────────────────────────────────────

export interface CacheEntry {
  tableId: string;
  queryHash: string;
  timestamp: number;
  ttl: number;
  data: SSBDataPoint[];
  label: string;
  dimensions: string[];
}
