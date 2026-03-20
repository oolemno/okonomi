// Non-SSB data sources — raw fetch

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StyringsrenteData {
  rate: number;
  date: string;
}

export interface KronekursData {
  [currency: string]: {
    rate: number;
    date: string;
    history: Array<{ date: string; rate: number }>;
  };
}

export interface BrregData {
  konkurser: number;
  nyregistreringer: number;
}

export interface EurostatRow {
  geo: string;
  name: string;
  rate: number | null;
  month: string;
}

export interface KraftprisData {
  [area: string]: {
    avg: number;
    current: number | null;
  };
}

// ─── SDMX helpers ───────────────────────────────────────────────────────────

function sdmxObservations(
  data: any,
  seriesKey = "0:0:0:0"
): Array<{ date: string; value: number }> {
  const series = data.data.dataSets[0].series[seriesKey];
  if (!series) return [];
  const timePeriods = data.data.structure.dimensions.observation[0].values;
  return Object.entries(series.observations)
    .map(([idx, val]: [string, any]) => ({
      date: timePeriods[Number(idx)]?.id ?? "",
      value: val[0],
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Norges Bank ────────────────────────────────────────────────────────────

export async function fetchStyringsrente(): Promise<StyringsrenteData> {
  const url =
    "https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=sdmx-json&lastNObservations=10";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Norges Bank IR: ${res.status}`);
  const data = await res.json();
  const obs = sdmxObservations(data);
  const last = obs[obs.length - 1];
  return { rate: last.value, date: last.date };
}

export async function fetchKronekurs(): Promise<KronekursData> {
  const url =
    "https://data.norges-bank.no/api/data/EXR/B.EUR+USD+SEK.NOK.SP?format=sdmx-json&lastNObservations=30";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Norges Bank EXR: ${res.status}`);
  const data = await res.json();

  const dataset = data.data.dataSets[0].series;
  const currencies = data.data.structure.dimensions.series[1].values;
  const timePeriods = data.data.structure.dimensions.observation[0].values;

  const result: KronekursData = {};

  for (const [key, series] of Object.entries(dataset)) {
    const currIdx = Number(key.split(":")[1]);
    const currId: string = currencies[currIdx].id;

    const history: Array<{ date: string; rate: number }> = [];
    for (const [obsIdx, obsVal] of Object.entries(
      (series as any).observations
    )) {
      history.push({
        date: timePeriods[Number(obsIdx)].id,
        rate: (obsVal as any)[0],
      });
    }
    history.sort((a, b) => a.date.localeCompare(b.date));

    const latest = history[history.length - 1];
    result[currId] = { rate: latest.rate, date: latest.date, history };
  }

  return result;
}

// ─── Brønnøysundregistrene ──────────────────────────────────────────────────

export async function fetchBrregStats(): Promise<BrregData> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dateStr = fourteenDaysAgo.toISOString().split("T")[0];

  const [nyregRes, konkursRes] = await Promise.all([
    fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter?fraRegistreringsdatoEnhetsregisteret=${dateStr}&size=1`,
      { headers: { Accept: "application/json" } }
    ),
    fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter?konkurs=true&size=1`,
      { headers: { Accept: "application/json" } }
    ),
  ]);

  const nyregData = await nyregRes.json();
  const konkursData = await konkursRes.json();

  return {
    nyregistreringer: nyregData.page?.totalElements ?? 0,
    konkurser: konkursData.page?.totalElements ?? 0,
  };
}

// ─── Eurostat HICP ──────────────────────────────────────────────────────────

const GEO_NAMES: Record<string, string> = {
  NO: "Norge",
  SE: "Sverige",
  DK: "Danmark",
  EA: "Eurosonen",
};

export async function fetchEurostatInflasjon(): Promise<EurostatRow[]> {
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_manr/M.RCH_A.CP00.NO+SE+DK+EA/?format=JSON&lastNObservations=1";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Eurostat: ${res.status}`);
  const data = await res.json();

  const geoIdx = data.dimension?.geo?.category?.index ?? {};
  const timeIdx = data.dimension?.time?.category?.index ?? {};
  const values = data.value ?? {};

  const timeKeys = Object.keys(timeIdx).sort();
  const lastTime = timeKeys[timeKeys.length - 1];
  const numTime = timeKeys.length;

  const rows: EurostatRow[] = [];
  for (const [geo, geoI] of Object.entries(geoIdx) as [string, number][]) {
    const idx = geoI * numTime + (timeIdx[lastTime] as number);
    rows.push({
      geo,
      name: GEO_NAMES[geo] ?? geo,
      rate: values[idx] ?? null,
      month: lastTime,
    });
  }

  // Sort: NO first, then rest
  rows.sort((a, b) => {
    if (a.geo === "NO") return -1;
    if (b.geo === "NO") return 1;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

// ─── Kraftpriser ────────────────────────────────────────────────────────────

export async function fetchKraftpris(): Promise<KraftprisData> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const areas = ["NO1", "NO2", "NO3", "NO4", "NO5"];

  const result: KraftprisData = {};

  await Promise.all(
    areas.map(async (area) => {
      // Try today, fall back to yesterday
      for (const d of [dateStr, yesterdayStr(now)]) {
        try {
          const url = `/api/kraft/api/v1/prices/${d}_${area}.json`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const prices: Array<{
            NOK_per_kWh: number;
            time_start: string;
            time_end: string;
          }> = await res.json();

          const avg =
            prices.reduce((s, p) => s + p.NOK_per_kWh, 0) / prices.length;
          const currentHour = prices.find((p) => {
            const start = new Date(p.time_start);
            const end = new Date(p.time_end);
            return now >= start && now < end;
          });

          result[area] = {
            avg: Math.round(avg * 10000) / 100, // øre/kWh
            current: currentHour
              ? Math.round(currentHour.NOK_per_kWh * 10000) / 100
              : null,
          };
          break;
        } catch {
          /* try next date */
        }
      }
    })
  );

  return result;
}

function yesterdayStr(now: Date): string {
  const d = new Date(now.getTime() - 86400000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
