/**
 * json-stat2 parser for SSB-data.
 *
 * SSB returnerer data i json-stat2-format der verdier ligger i en flat array.
 * Posisjonen i arrayen bestemmes av dimensjonsindeksene (row-major order).
 * Denne parseren mapper den flate arrayen til lesbare SSBDataPoint-objekter.
 */

import type {
  JsonStat2Response,
  SSBDataPoint,
  TimeSeriesPoint,
} from "./types.js";

/**
 * Parsed SSB-resultat med hjelpemetoder for filtrering og transformasjon.
 */
export class SSBResult {
  readonly label: string;
  readonly dimensions: string[];
  readonly data: SSBDataPoint[];

  constructor(label: string, dimensions: string[], data: SSBDataPoint[]) {
    this.label = label;
    this.dimensions = dimensions;
    this.data = data;
  }

  /** Filtrer til datapunkter der en dimensjon har en bestemt verdi (kode). */
  filter(dimension: string, value: string): SSBResult {
    const filtered = this.data.filter((d) => d.codes[dimension] === value);
    return new SSBResult(this.label, this.dimensions, filtered);
  }

  /** Filtrer med label i stedet for kode. */
  filterByLabel(dimension: string, label: string): SSBResult {
    const filtered = this.data.filter((d) => d.labels[dimension] === label);
    return new SSBResult(this.label, this.dimensions, filtered);
  }

  /**
   * Konverter til tidsserie. Forventer at datasettet allerede er filtrert
   * ned til én kombinasjon av ikke-tid-dimensjoner. Nuller hoppes over.
   */
  asTimeSeries(): TimeSeriesPoint[] {
    // Finn tidsdimensjonen (vanligvis "Tid")
    const timeDim = this.dimensions.find(
      (d) => d === "Tid" || d.toLowerCase().includes("tid")
    );
    if (!timeDim) return [];

    return this.data
      .filter((d) => d.value != null)
      .map((d) => ({
        time: d.codes[timeDim],
        value: d.value as number,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  /** Hent siste datapunkt (sortert etter tid). */
  latest(): SSBDataPoint | null {
    const timeDim = this.dimensions.find(
      (d) => d === "Tid" || d.toLowerCase().includes("tid")
    );

    if (!timeDim) {
      return this.data.at(-1) ?? null;
    }

    const sorted = [...this.data]
      .filter((d) => d.value != null)
      .sort((a, b) => a.codes[timeDim].localeCompare(b.codes[timeDim]));

    return sorted.at(-1) ?? null;
  }

  /** Konverter til flat tabell (array of objects). */
  asTable(): Record<string, string | number | null>[] {
    return this.data.map((d) => {
      const row: Record<string, string | number | null> = {};
      for (const dim of this.dimensions) {
        row[dim] = d.labels[dim];
        row[`${dim}_kode`] = d.codes[dim];
      }
      row.verdi = d.value;
      return row;
    });
  }

  /** Hent alle unike verdier for en dimensjon. */
  uniqueValues(dimension: string): { code: string; label: string }[] {
    const seen = new Map<string, string>();
    for (const d of this.data) {
      const code = d.codes[dimension];
      if (code && !seen.has(code)) {
        seen.set(code, d.labels[dimension]);
      }
    }
    return Array.from(seen, ([code, label]) => ({ code, label }));
  }

  /** Grupper datapunktene etter en dimensjon. */
  groupBy(dimension: string): Record<string, SSBResult> {
    const groups: Record<string, SSBDataPoint[]> = {};
    for (const d of this.data) {
      const key = d.codes[dimension];
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    const result: Record<string, SSBResult> = {};
    for (const [key, points] of Object.entries(groups)) {
      result[key] = new SSBResult(this.label, this.dimensions, points);
    }
    return result;
  }
}

/**
 * Parse en rå json-stat2-respons til et SSBResult.
 *
 * json-stat2 lagrer verdier i en flat array der posisjonen beregnes via
 * dimensjonsindekser i row-major order:
 *   index = sum_i(dim_i_pos * stride_i)
 * der stride_i = produkt av størrelsen til alle dimensjoner etter i.
 */
export function parseJsonStat2(response: JsonStat2Response): SSBResult {
  const dimIds = response.id;
  const dimSizes = response.size;
  const values = response.value;

  // Bygg dimensjonslookup: for hver dimensjon, map indeks → kode og kode → label
  const dimInfo = dimIds.map((dimId, i) => {
    const dim = response.dimension[dimId];
    const catIndex = dim.category.index;
    const catLabel = dim.category.label;

    // index kan være enten { "kode": posisjon } eller ["kode1", "kode2"]
    let orderedCodes: string[];
    if (Array.isArray(catIndex)) {
      orderedCodes = catIndex;
    } else {
      orderedCodes = Object.entries(catIndex)
        .sort(([, a], [, b]) => a - b)
        .map(([code]) => code);
    }

    return {
      id: dimId,
      size: dimSizes[i],
      codes: orderedCodes,
      labels: catLabel,
    };
  });

  // Beregn strides for row-major order
  const strides = new Array(dimIds.length);
  strides[dimIds.length - 1] = 1;
  for (let i = dimIds.length - 2; i >= 0; i--) {
    strides[i] = strides[i + 1] * dimSizes[i + 1];
  }

  // Iterer over alle kombinasjoner av dimensjonsverdier
  const totalSize = values.length;
  const data: SSBDataPoint[] = new Array(totalSize);

  for (let flatIdx = 0; flatIdx < totalSize; flatIdx++) {
    const labels: Record<string, string> = {};
    const codes: Record<string, string> = {};

    let remainder = flatIdx;
    for (let d = 0; d < dimInfo.length; d++) {
      const dimPos = Math.floor(remainder / strides[d]);
      remainder = remainder % strides[d];

      const code = dimInfo[d].codes[dimPos];
      codes[dimInfo[d].id] = code;
      labels[dimInfo[d].id] = dimInfo[d].labels[code] ?? code;
    }

    data[flatIdx] = {
      value: values[flatIdx],
      labels,
      codes,
    };
  }

  return new SSBResult(response.label, dimIds, data);
}
