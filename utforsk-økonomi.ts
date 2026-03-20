#!/usr/bin/env npx tsx

// Utforsk norske økonomi-API-er for dashboardbruk
// Kjør: npx tsx utforsk-økonomi.ts

import { writeFileSync } from "fs";

const TIMEOUT = 10_000;
const POPULATION = 5_500_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface SourceReport {
  name: string;
  status: "✅" | "🟡" | "❌";
  url: string;
  auth: string;
  format: string;
  frequency: string;
  lastDatapoint: string;
  exampleValue: string;
  quality: string;
  gotchas: string;
}

const reports: SourceReport[] = [];

function header(text: string) {
  console.log("\n" + "═".repeat(80));
  console.log(`  ${text}`);
  console.log("═".repeat(80));
}

function subheader(text: string) {
  console.log(`\n  ── ${text} ${"─".repeat(Math.max(0, 60 - text.length))}`);
}

async function fetchJson(url: string, options?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text; // Return raw text if not JSON
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFetch(
  url: string,
  options?: RequestInit
): Promise<{ data: any; ok: boolean; error?: string }> {
  try {
    const data = await fetchJson(url, options);
    return { data, ok: true };
  } catch (e: any) {
    return { data: null, ok: false, error: e.message };
  }
}

// ─── 1. Norges Bank ─────────────────────────────────────────────────────────

async function norgesBank() {
  header("1. NORGES BANK – Rente og valuta");

  // Styringsrente
  subheader("Styringsrente");
  // Correct key: B.KPRA.SD.R (Freq.InstrumentType.Tenor.UnitMeasure)
  const irUrl =
    "https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=sdmx-json&lastNObservations=10";
  const ir = await tryFetch(irUrl);
  if (ir.ok) {
    try {
      const series =
        ir.data.data.dataSets[0].series["0:0:0:0"].observations;
      const timePeriods =
        ir.data.data.structure.dimensions.observation[0].values;
      console.log("  Styringsrente – siste 10 observasjoner:");
      const entries: { date: string; value: string }[] = [];
      for (const [idx, val] of Object.entries(series) as any) {
        const date = timePeriods[parseInt(idx)]?.id || "?";
        const value = val[0];
        entries.push({ date, value });
        console.log(`    ${date}: ${value}%`);
      }
      const last = entries[entries.length - 1];
      reports.push({
        name: "Norges Bank – Styringsrente",
        status: "✅",
        url: irUrl,
        auth: "Kreves ikke",
        format: "SDMX-JSON",
        frequency: "Ved endring (ca. 8 ganger/år)",
        lastDatapoint: last.date,
        exampleValue: `Styringsrente: ${last.value}% (per ${last.date})`,
        quality: "Utmerket – offisiell kilde",
        gotchas: "SDMX-JSON er kompleks å parse",
      });
    } catch (e: any) {
      console.log("  ⚠ Kunne ikke parse respons:", e.message);
      console.log(
        "  Rå struktur:",
        JSON.stringify(ir.data).substring(0, 300)
      );
    }
  } else {
    console.log("  ❌ Feil:", ir.error);
    reports.push({
      name: "Norges Bank – Styringsrente",
      status: "❌",
      url: irUrl,
      auth: "?",
      format: "?",
      frequency: "?",
      lastDatapoint: "?",
      exampleValue: "Feil: " + ir.error,
      quality: "?",
      gotchas: ir.error || "",
    });
  }

  // Kronekurs
  subheader("Kronekurs (EUR, USD, SEK)");
  const exrUrl =
    "https://data.norges-bank.no/api/data/EXR/B.EUR+USD+SEK.NOK.SP?format=sdmx-json&lastNObservations=30";
  const exr = await tryFetch(exrUrl);
  if (exr.ok) {
    try {
      const dataset = exr.data.data.dataSets[0].series;
      const currencies =
        exr.data.data.structure.dimensions.series[1].values;
      const timePeriods =
        exr.data.data.structure.dimensions.observation[0].values;

      for (const [seriesKey, seriesData] of Object.entries(dataset) as any) {
        const currIdx = parseInt(seriesKey.split(":")[1]);
        const currName = currencies[currIdx]?.id || "?";
        const obs = seriesData.observations;
        const obsEntries = Object.entries(obs);
        const lastObs = obsEntries[obsEntries.length - 1] as any;
        const lastDate =
          timePeriods[parseInt(lastObs[0])]?.id || "?";
        const lastVal = lastObs[1][0];
        console.log(
          `  ${currName}/NOK: ${lastVal} (${lastDate}) – ${obsEntries.length} observasjoner hentet`
        );
      }
      reports.push({
        name: "Norges Bank – Valutakurser",
        status: "✅",
        url: exrUrl,
        auth: "Kreves ikke",
        format: "SDMX-JSON",
        frequency: "Daglig (bankdager)",
        lastDatapoint:
          timePeriods[timePeriods.length - 1]?.id || "?",
        exampleValue: "Se konsollutskrift for kurser",
        quality: "Utmerket – offisiell kilde",
        gotchas: "Ingen data i helger/helligdager",
      });
    } catch (e: any) {
      console.log("  ⚠ Parsefeil:", e.message);
    }
  } else {
    console.log("  ❌ Feil:", exr.error);
  }

  // NIBOR
  subheader("NIBOR 3 mnd");
  // NIBOR is no longer in Norges Bank IR dataflow – it's published via NOWA/Short rates
  // Try SHORT_RATES with NOWA (Norwegian Overnight Weighted Average)
  const niborUrl =
    "https://data.norges-bank.no/api/data/SHORT_RATES/B.NOWA_AVERAGE.3M.R?format=sdmx-json&lastNObservations=10";
  let nibor = await tryFetch(niborUrl);
  if (!nibor.ok) {
    // NIBOR is no longer in Norges Bank API – note this
    console.log("  🟡 NIBOR ikke lenger tilgjengelig via Norges Bank API");
    console.log("  NIBOR publiseres nå av Oslo Børs / NoRe Benchmarks");
    console.log("  Prøver NOWA (Norges Banks daglige rente) som alternativ...");
    const nowaUrl =
      "https://data.norges-bank.no/api/data/SHORT_RATES/B.NOWA.ON.R?format=sdmx-json&lastNObservations=10";
    nibor = await tryFetch(nowaUrl);
  }
  if (nibor.ok) {
    try {
      const series =
        nibor.data.data.dataSets[0].series["0:0:0:0"].observations;
      const timePeriods =
        nibor.data.data.structure.dimensions.observation[0].values;
      console.log("  NIBOR 3 mnd – siste 10:");
      let lastDate = "",
        lastVal = "";
      for (const [idx, val] of Object.entries(series) as any) {
        const date = timePeriods[parseInt(idx)]?.id || "?";
        lastDate = date;
        lastVal = val[0];
        console.log(`    ${date}: ${val[0]}%`);
      }
      reports.push({
        name: "Norges Bank – NIBOR 3 mnd",
        status: "✅",
        url: niborUrl,
        auth: "Kreves ikke",
        format: "SDMX-JSON",
        frequency: "Daglig (bankdager)",
        lastDatapoint: lastDate,
        exampleValue: `NIBOR 3M: ${lastVal}% (per ${lastDate})`,
        quality: "Utmerket",
        gotchas: "Samme SDMX-format",
      });
    } catch (e: any) {
      console.log("  ⚠ Parsefeil:", e.message);
    }
  } else {
    console.log("  ❌ Feil:", nibor.error);
  }

  // Sjekk rentebane
  subheader("Rentebane/prognose");
  const rentebaneUrl =
    "https://data.norges-bank.no/api/data/IR/B.KPRA.NOK.FP?format=sdmx-json&lastNObservations=20";
  const rb = await tryFetch(rentebaneUrl);
  if (rb.ok && rb.data?.data?.dataSets) {
    console.log("  ✅ Rentebane-data funnet!");
    try {
      const series =
        rb.data.data.dataSets[0].series["0:0:0:0"].observations;
      const timePeriods =
        rb.data.data.structure.dimensions.observation[0].values;
      for (const [idx, val] of Object.entries(series).slice(-5) as any) {
        const date = timePeriods[parseInt(idx)]?.id || "?";
        console.log(`    ${date}: ${val[0]}%`);
      }
    } catch {
      console.log("  Rentebane finnes, men annet format");
      console.log(
        "  Struktur:",
        JSON.stringify(rb.data).substring(0, 500)
      );
    }
  } else {
    console.log(
      "  🟡 Rentebane ikke tilgjengelig via API (publiseres kun i PPR-rapporten)"
    );
    // Try another approach
    const rbAlt =
      "https://data.norges-bank.no/api/data/IR/?format=sdmx-json&lastNObservations=1&detail=serieskeysonly";
    const rbAltRes = await tryFetch(rbAlt);
    if (rbAltRes.ok) {
      console.log(
        "  Tilgjengelige IR-serier:",
        JSON.stringify(rbAltRes.data?.data?.structure?.dimensions?.series || "")
          .substring(0, 500)
      );
    }
  }
}

// ─── 2. SSB ─────────────────────────────────────────────────────────────────

async function ssbQuery(
  tableId: string,
  query: any
): Promise<{ data: any; ok: boolean; error?: string }> {
  const url = `https://data.ssb.no/api/v0/no/table/${tableId}`;
  return tryFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
}

async function ssbMetadata(
  tableId: string
): Promise<{ data: any; ok: boolean; error?: string }> {
  return tryFetch(
    `https://data.ssb.no/api/v0/no/table/${tableId}`
  );
}

function parseJsonStat2(data: any): {
  dimensions: Record<string, string[]>;
  values: number[];
  label: string;
} {
  const dims: Record<string, string[]> = {};
  for (const dimId of data.id) {
    dims[dimId] = data.size[data.id.indexOf(dimId)] > 0
      ? Object.values(data.dimension[dimId].category.label as Record<string, string>)
      : [];
  }
  return {
    dimensions: dims,
    values: data.value,
    label: data.label || "",
  };
}

async function ssb() {
  header("2. SSB – Inflasjon, bolig, arbeid");

  // KPI
  subheader("KPI totalindeks (tabell 03013)");
  const kpiQuery = {
    query: [
      {
        code: "Konsumgrp",
        selection: { filter: "item", values: ["TOTAL"] },
      },
      {
        code: "ContentsCode",
        selection: { filter: "item", values: ["KpiIndMnd"] },
      },
      { code: "Tid", selection: { filter: "top", values: ["12"] } },
    ],
    response: { format: "json-stat2" },
  };
  const kpi = await ssbQuery("03013", kpiQuery);
  if (kpi.ok) {
    try {
      const parsed = parseJsonStat2(kpi.data);
      const months = parsed.dimensions["Tid"];
      console.log("  KPI totalindeks – siste 12 måneder:");
      for (let i = 0; i < months.length; i++) {
        const yoyChange =
          i > 0
            ? ` (endring fra forrige: ${((parsed.values[i] / parsed.values[i - 1] - 1) * 100).toFixed(2)}%)`
            : "";
        console.log(`    ${months[i]}: ${parsed.values[i]}${yoyChange}`);
      }
      const lastMonth = months[months.length - 1];
      const lastVal = parsed.values[parsed.values.length - 1];
      reports.push({
        name: "SSB – KPI totalindeks",
        status: "✅",
        url: "https://data.ssb.no/api/v0/no/table/03013",
        auth: "Kreves ikke",
        format: "JSON-stat2 (POST)",
        frequency: "Månedlig (ca. 10. i måneden)",
        lastDatapoint: lastMonth,
        exampleValue: `KPI: ${lastVal} (${lastMonth})`,
        quality: "Utmerket – offisiell statistikk",
        gotchas: "POST request med JSON body påkrevd",
      });
    } catch (e: any) {
      console.log("  ⚠ Parsefeil:", e.message);
      console.log("  Rå:", JSON.stringify(kpi.data).substring(0, 300));
    }
  } else {
    console.log("  ❌ Feil:", kpi.error);
  }

  // KPI-JAE
  subheader("KPI-JAE / Kjerneinflasjon (tabell 08981)");
  // Hent metadata først
  const meta08981 = await ssbMetadata("08981");
  if (meta08981.ok) {
    console.log(
      "  Metadata tabell 08981 – tilgjengelige variabler:"
    );
    if (Array.isArray(meta08981.data.variables)) {
      for (const v of meta08981.data.variables) {
        console.log(`    ${v.code}: ${v.text} (${v.values?.length || 0} verdier)`);
        if (v.code === "ContentsCode" || v.code === "Konsumgrp") {
          const sample = v.values
            .slice(0, 8)
            .map((val: string, i: number) => `${val}=${v.valueTexts[i]}`)
            .join(", ");
          console.log(`      Eksempler: ${sample}`);
        }
      }
    }

    // Tabell 08981 has Maaned+Tid (year) dimensions, not Konsumgrp
    // It only has KpiIndMnd, not KPI-JAE. KPI-JAE is in a different table.
    // Use tabell 03013 with KPI-JAE content code
    console.log("  08981 inneholder kun KPI, ikke KPI-JAE.");
    console.log("  Prøver KPI-JAE via tabell 03013...");

    // First check what content codes 03013 has
    const meta03013 = await ssbMetadata("03013");
    if (meta03013.ok) {
      const ccVar = meta03013.data.variables.find((v: any) => v.code === "ContentsCode");
      if (ccVar) {
        console.log(`  Tilgjengelige innholdskoder i 03013: ${ccVar.values.map((v: string, i: number) => `${v}=${ccVar.valueTexts[i]}`).join(", ")}`);
        // Try KPI-JAE codes
        const jaeCodes = ccVar.values.filter((v: string) =>
          v.toLowerCase().includes("jae") || v.toLowerCase().includes("kjerne"));
        if (jaeCodes.length > 0) {
          const jaeQuery = {
            query: [
              { code: "Konsumgrp", selection: { filter: "item", values: ["TOTAL"] } },
              { code: "ContentsCode", selection: { filter: "item", values: [jaeCodes[0]] } },
              { code: "Tid", selection: { filter: "top", values: ["12"] } },
            ],
            response: { format: "json-stat2" },
          };
          const jae = await ssbQuery("03013", jaeQuery);
          if (jae.ok) {
            const parsed = parseJsonStat2(jae.data);
            const months = parsed.dimensions["Tid"];
            console.log(`  KPI-JAE (${jaeCodes[0]}) – siste 12 måneder:`);
            for (let i = 0; i < months.length; i++) {
              console.log(`    ${months[i]}: ${parsed.values[i]}`);
            }
            reports.push({
              name: "SSB – KPI-JAE",
              status: "✅",
              url: "https://data.ssb.no/api/v0/no/table/03013",
              auth: "Kreves ikke",
              format: "JSON-stat2 (POST)",
              frequency: "Månedlig",
              lastDatapoint: months[months.length - 1],
              exampleValue: `KPI-JAE: ${parsed.values[parsed.values.length - 1]} (${months[months.length - 1]})`,
              quality: "Utmerket",
              gotchas: `Bruker innholdskode ${jaeCodes[0]} i tabell 03013`,
            });
          }
        } else {
          console.log("  Ingen KPI-JAE-kode funnet i 03013");
        }
      }
    }
  } else {
    console.log("  ❌ Metadata-henting feilet:", meta08981.error);
  }

  // Boligpris
  subheader("Boligprisindeks (tabell 07241)");
  // First get metadata to build correct query
  const boligMeta = await ssbMetadata("07241");
  let boligQueryBody: any;
  if (boligMeta.ok && Array.isArray(boligMeta.data?.variables)) {
    console.log("  Metadata tabell 07241:");
    for (const v of boligMeta.data.variables) {
      console.log(`    ${v.code}: ${v.text} – ${v.values.slice(0, 5).map((val: string, i: number) => `${val}=${v.valueTexts[i]}`).join(", ")}`);
    }
    // Build query dynamically based on available vars
    boligQueryBody = {
      query: boligMeta.data.variables
        .filter((v: any) => v.code !== "Tid")
        .map((v: any) => ({
          code: v.code,
          selection: { filter: "item", values: [v.values[0]] },
        }))
        .concat([
          { code: "Tid", selection: { filter: "top", values: ["8"] } },
        ]),
      response: { format: "json-stat2" },
    };
  } else {
    boligQueryBody = {
      query: [
        { code: "Boligtype", selection: { filter: "item", values: ["00"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["KvPris"] } },
        { code: "Tid", selection: { filter: "top", values: ["8"] } },
      ],
      response: { format: "json-stat2" },
    };
  }
  const bolig = await ssbQuery("07241", boligQueryBody);
  if (bolig.ok) {
    try {
      const parsed = parseJsonStat2(bolig.data);
      const quarters = parsed.dimensions["Tid"];
      console.log("  Boligpris (hele landet) – siste 8 kvartaler:");
      for (let i = 0; i < quarters.length; i++) {
        console.log(
          `    ${quarters[i]}: ${parsed.values[i]?.toLocaleString("no-NO")} kr/m²`
        );
      }
      reports.push({
        name: "SSB – Boligprisindeks",
        status: "✅",
        url: "https://data.ssb.no/api/v0/no/table/07241",
        auth: "Kreves ikke",
        format: "JSON-stat2 (POST)",
        frequency: "Kvartalsvis",
        lastDatapoint: quarters[quarters.length - 1],
        exampleValue: `Kvm-pris: ${parsed.values[parsed.values.length - 1]?.toLocaleString("no-NO")} kr (${quarters[quarters.length - 1]})`,
        quality: "God – offisiell statistikk",
        gotchas: "Kun kvartalsvis. Tabell 07241 har ikke regiondimensjon – bruk 13655 for regionale data.",
      });
    } catch (e: any) {
      console.log("  ⚠ Parsefeil:", e.message);
      console.log("  Rå:", JSON.stringify(bolig.data).substring(0, 400));
    }
  } else {
    console.log("  ❌ Feil:", bolig.error);
    // Prøv metadata
    const meta = await ssbMetadata("07241");
    if (meta.ok) {
      console.log("  Metadata:");
      for (const v of meta.data.variables || []) {
        console.log(`    ${v.code}: ${v.values?.slice(0, 5).join(", ")}`);
      }
    }
  }

  // Arbeidsledighet AKU
  subheader("Arbeidsledighet AKU (tabell 05111)");
  const akuMeta = await ssbMetadata("05111");
  if (akuMeta.ok && Array.isArray(akuMeta.data.variables)) {
    console.log("  Metadata tabell 05111:");
    for (const v of akuMeta.data.variables) {
      console.log(
        `    ${v.code}: ${v.text} – verdier: ${v.values.slice(0, 5).map((val: string, i: number) => `${val}=${v.valueTexts[i]}`).join(", ")}`
      );
    }

    // Query: Arbeidsledige, Begge kjønn, 15-74, Prosent
    const akuQuery = {
      query: [
        { code: "ArbStyrkStatus", selection: { filter: "item", values: ["2"] } },
        { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
        { code: "Alder", selection: { filter: "item", values: ["15-74"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["Prosent"] } },
        { code: "Tid", selection: { filter: "top", values: ["12"] } },
      ],
      response: { format: "json-stat2" },
    };
    const aku = await ssbQuery("05111", akuQuery);
    if (aku.ok) {
      const parsed = parseJsonStat2(aku.data);
      const periods = parsed.dimensions["Tid"];
      console.log("  AKU-ledighet (arbeidsledige, prosent av befolkning 15-74):");
      for (let i = 0; i < periods.length; i++) {
        console.log(`    ${periods[i]}: ${parsed.values[i]}%`);
      }
      reports.push({
        name: "SSB – Arbeidsledighet (AKU)",
        status: "✅",
        url: "https://data.ssb.no/api/v0/no/table/05111",
        auth: "Kreves ikke",
        format: "JSON-stat2 (POST)",
        frequency: "Månedlig (glidende gjennomsnitt)",
        lastDatapoint: periods[periods.length - 1],
        exampleValue: `Ledighet: ${parsed.values[parsed.values.length - 1]}% (${periods[periods.length - 1]})`,
        quality: "God – AKU-basert",
        gotchas: "Glidende 3-måneders gjennomsnitt, ikke enkeltmåned",
      });
    } else {
      console.log("  ⚠ Query feilet:", aku.error);
    }
  } else {
    console.log("  ❌ Metadata feilet:", akuMeta.error);
  }

  // Lønnsvekst
  subheader("Lønnsvekst (tabell 11418)");
  const lonnMeta = await ssbMetadata("11418");
  if (lonnMeta.ok && Array.isArray(lonnMeta.data.variables)) {
    console.log("  Metadata tabell 11418:");
    for (const v of lonnMeta.data.variables) {
      console.log(
        `    ${v.code}: ${v.text} – ${v.values.slice(0, 5).map((val: string, i: number) => `${val}=${v.valueTexts[i]}`).join(", ")}`
      );
    }

    const lonnQuery = {
      query: lonnMeta.data.variables
        .filter((v: any) => v.code !== "Tid")
        .map((v: any) => ({
          code: v.code,
          selection: { filter: "item", values: [v.values[0]] },
        }))
        .concat([
          { code: "Tid", selection: { filter: "top", values: ["5"] } },
        ]),
      response: { format: "json-stat2" },
    };
    const lonn = await ssbQuery("11418", lonnQuery);
    if (lonn.ok) {
      const parsed = parseJsonStat2(lonn.data);
      const periods = parsed.dimensions["Tid"];
      console.log("  Lønn – siste perioder:");
      for (let i = 0; i < periods.length; i++) {
        const change =
          i > 0
            ? ` (${((parsed.values[i] / parsed.values[i - 1] - 1) * 100).toFixed(1)}% endring)`
            : "";
        console.log(
          `    ${periods[i]}: ${parsed.values[i]?.toLocaleString("no-NO")} kr${change}`
        );
      }
      reports.push({
        name: "SSB – Lønnsvekst",
        status: "✅",
        url: "https://data.ssb.no/api/v0/no/table/11418",
        auth: "Kreves ikke",
        format: "JSON-stat2 (POST)",
        frequency: "Årlig",
        lastDatapoint: periods[periods.length - 1],
        exampleValue: `Lønn: ${parsed.values[parsed.values.length - 1]?.toLocaleString("no-NO")} kr (${periods[periods.length - 1]})`,
        quality: "God",
        gotchas: "Kun årstall, ikke kvartalsvis",
      });
    } else {
      console.log("  ⚠ Feilet:", lonn.error);
    }
  } else {
    console.log("  ❌ Feilet. Prøver tabell 12441...");
    const lonnMeta2 = await ssbMetadata("12441");
    if (lonnMeta2.ok) {
      console.log("  12441 metadata funnet:");
      for (const v of lonnMeta2.data.variables || []) {
        console.log(`    ${v.code}: ${v.text}`);
      }
    }
  }
}

// ─── 3. NBIM – Oljefondet ───────────────────────────────────────────────────

async function nbim() {
  header("3. NBIM – Oljefondet");

  const urls = [
    "https://data.nbim.no/v1/market-value?format=json",
    "https://www.nbim.no/api/market-value",
    "https://www.nbim.no/api/v1/market-value",
    "https://data.nbim.no/api/v1/market-value",
  ];

  let found = false;
  for (const url of urls) {
    subheader(`Prøver: ${url}`);
    const res = await tryFetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      console.log("  ✅ Respons mottatt!");
      const preview =
        typeof res.data === "string"
          ? res.data.substring(0, 500)
          : JSON.stringify(res.data, null, 2).substring(0, 500);
      console.log("  Data:", preview);

      if (typeof res.data === "object") {
        // Prøv å finne verdi
        const value =
          res.data.marketValue ||
          res.data.value ||
          res.data.totalValue ||
          res.data[0]?.marketValue;
        if (value) {
          const perCapita = (Number(value) / POPULATION).toFixed(0);
          console.log(`  Fondets verdi: ${Number(value).toLocaleString("no-NO")} NOK`);
          console.log(`  Per innbygger: ${Number(perCapita).toLocaleString("no-NO")} NOK`);
        }
      }

      reports.push({
        name: "NBIM – Oljefondet",
        status: "✅",
        url,
        auth: "Kreves ikke",
        format: typeof res.data === "object" ? "JSON" : "HTML/Annet",
        frequency: "Daglig",
        lastDatapoint: "Se data over",
        exampleValue: "Se konsollutskrift",
        quality: "Avhenger av API-struktur",
        gotchas: "Flere URL-er prøvd – sjekk hvilken som gir best data",
      });
      found = true;
      break;
    } else {
      console.log(`  ❌ ${res.error}`);
    }
  }

  if (!found) {
    console.log("\n  Ingen API funnet. Sjekker hovedsiden...");
    const mainPage = await tryFetch(
      "https://www.nbim.no/en/the-fund/market-value/",
      { headers: { Accept: "text/html" } }
    );
    if (mainPage.ok) {
      const html = typeof mainPage.data === "string" ? mainPage.data : "";
      // Look for JSON data embedded in the page
      const jsonMatch = html.match(/market[Vv]alue["\s:]+([0-9,.]+)/);
      if (jsonMatch) {
        console.log(`  Fant verdi i HTML: ${jsonMatch[1]}`);
      } else {
        console.log("  HTML-side lastet, men verdi må scrapes/finnes manuelt");
      }
    }
    reports.push({
      name: "NBIM – Oljefondet",
      status: "❌",
      url: "Ingen fungerende API funnet",
      auth: "N/A",
      format: "N/A",
      frequency: "Daglig (på websiden)",
      lastDatapoint: "N/A",
      exampleValue: "Krever scraping eller manuell henting",
      quality: "Data finnes, men ikke via åpent API",
      gotchas: "Må scrape fra nbim.no eller finne alternativ datakilde",
    });
  }
}

// ─── 4. NAV – Arbeidsmarked ─────────────────────────────────────────────────

async function nav() {
  header("4. NAV – Arbeidsmarked");

  // Registrert ledighet
  subheader("Registrert ledighet");
  const navUrls = [
    "https://data.nav.no/api/v1/arbeidssoekerregistrering",
    "https://data.nav.no/api/",
    "https://arbeid.nav.no/arbeidsgiver/statistikk/api/",
  ];

  for (const url of navUrls) {
    const res = await tryFetch(url, {
      headers: { Accept: "application/json" },
    });
    console.log(
      `  ${url}: ${res.ok ? "✅" : "❌"} ${res.ok ? "" : res.error}`
    );
    if (res.ok) {
      const preview =
        typeof res.data === "string"
          ? res.data.substring(0, 300)
          : JSON.stringify(res.data, null, 2).substring(0, 300);
      console.log("  Data:", preview);
    }
  }

  // NAV publiserer data via SSB/statistikk
  console.log("\n  NAV publiserer hovedsakelig via nav.no/statistikk.");
  console.log("  Prøver helt-ledige via SSB-tabell (NAV-data)...");

  // NAV sine tall finnes i SSB tabell 10540
  const navSsbMeta = await ssbMetadata("10540");
  if (navSsbMeta.ok && Array.isArray(navSsbMeta.data?.variables)) {
    console.log("  SSB-tabell 10540 (NAV registrerte arbeidssøkere):");
    for (const v of navSsbMeta.data.variables) {
      console.log(
        `    ${v.code}: ${v.text} – ${v.values.slice(0, 3).join(", ")}`
      );
    }

    // Hent siste 12 måneder for hele landet
    const navQuery = {
      query: [
        { code: "Region", selection: { filter: "item", values: ["0"] } },
        { code: "Alder", selection: { filter: "item", values: ["15-74"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["RegHeltLedige"] } },
        { code: "Tid", selection: { filter: "top", values: ["12"] } },
      ],
      response: { format: "json-stat2" },
    };
    const navData = await ssbQuery("10540", navQuery);
    if (navData.ok) {
      const parsed = parseJsonStat2(navData.data);
      const periods = parsed.dimensions["Tid"];
      console.log("  NAV registrert helt ledige (hele landet, 15-74):");
      for (let i = 0; i < periods.length; i++) {
        console.log(`    ${periods[i]}: ${parsed.values[i]?.toLocaleString("no-NO")} personer`);
      }
    }
  }

  // Ledige stillinger
  subheader("Ledige stillinger");
  const stillingerUrls = [
    "https://arbeidsplassen.nav.no/public-feed/api/v1/ads?size=5",
    "https://pam-stilling-feed.nav.no/api/v1/feed?size=5",
  ];

  for (const url of stillingerUrls) {
    const res = await tryFetch(url, {
      headers: { Accept: "application/json" },
    });
    console.log(
      `  ${url}: ${res.ok ? "✅" : "❌"} ${res.ok ? "" : res.error}`
    );
    if (res.ok) {
      const preview =
        typeof res.data === "string"
          ? res.data.substring(0, 300)
          : JSON.stringify(res.data, null, 2).substring(0, 300);
      console.log("  Data:", preview);
    }
  }

  reports.push({
    name: "NAV – Arbeidsmarked",
    status: "🟡",
    url: "Diverse – se utskrift",
    auth: "Varierer",
    format: "JSON/HTML",
    frequency: "Månedlig (statistikk), daglig (stillinger)",
    lastDatapoint: "Varierer",
    exampleValue: "Se konsollutskrift",
    quality:
      "Begrenset API-tilgang – hoveddata via SSB eller nav.no statistikk",
    gotchas: "NAV mangler et samlet åpent REST-API for ledighetsstatistikk",
  });
}

// ─── 5. Finansportalen – Boliglånsrenter ────────────────────────────────────

async function finansportalen() {
  header("5. FINANSPORTALEN – Boliglånsrenter");

  // Try multiple URLs for Finansportalen
  const fpUrls = [
    "https://www.finansportalen.no/feed/v3/bank/boliglan.atom",
    "https://finansportalen.no/feed/v3/bank/boliglan.atom",
    "https://www.finansportalen.no/api/bank/boliglan",
  ];

  let fpFound = false;
  for (const atomUrl of fpUrls) {
    subheader(`Prøver: ${atomUrl}`);
    const atom = await tryFetch(atomUrl, {
      headers: { Accept: "application/atom+xml, application/xml, text/xml, application/json" },
    });
    if (atom.ok) {
      const text = typeof atom.data === "string" ? atom.data : JSON.stringify(atom.data);
      // Check if it's actually XML/JSON and not an HTML redirect
      if (text.startsWith("<!doctype") || text.startsWith("<html")) {
        console.log("  🟡 Fikk HTML-side (redirect/blokkert), ikke data-feed");
        continue;
      }
      console.log("  ✅ Feed mottatt!");
      console.log("  Lengde:", text.length, "tegn");
      const entries = text.match(/<entry>[\s\S]*?<\/entry>/g);
      if (entries) {
        console.log(`  Antall oppføringer: ${entries.length}`);
        const firstEntry = entries[0];
        const entryTitle = firstEntry.match(/<title[^>]*>(.*?)<\/title>/)?.[1] || "?";
        const rate = firstEntry.match(/<fp:nominalRate[^>]*>(.*?)<\/fp:nominalRate>/)?.[1] ||
          firstEntry.match(/rate[^>]*>(.*?)<\//)?.[1];
        console.log(`  Første oppføring: ${entryTitle}`);
        if (rate) console.log(`  Rente: ${rate}%`);
      }
      reports.push({
        name: "Finansportalen – Boliglånsrenter",
        status: "✅",
        url: atomUrl,
        auth: "Kreves ikke",
        format: "Atom/XML",
        frequency: "Daglig/ved endring",
        lastDatapoint: "Se feed",
        exampleValue: "Se konsollutskrift",
        quality: "God – komplett oversikt over boliglån",
        gotchas: "XML-format krever parsing",
      });
      fpFound = true;
      break;
    } else {
      console.log(`  ❌ ${atom.error}`);
    }
  }

  if (!fpFound) {
    console.log("\n  Finansportalen-feed utilgjengelig (trolig omdirigert til HTML).");

    // Sjekk Norges Bank for utlånsrenter
    subheader("Norges Bank – utlånsrenter (alternativ)");
    const nbRateUrl =
      "https://data.norges-bank.no/api/data/IR/B..NOK.SP?format=sdmx-json&lastNObservations=5&detail=serieskeysonly";
    const nbRate = await tryFetch(nbRateUrl);
    if (nbRate.ok) {
      // List available series
      try {
        const series = nbRate.data.data.structure.dimensions.series;
        const instrumentTypes = series.find((s: any) => s.id === "INSTRUMENT_TYPE");
        if (instrumentTypes) {
          console.log("  Tilgjengelige renteserier i Norges Bank:");
          for (const v of instrumentTypes.values.slice(0, 15)) {
            console.log(`    ${v.id}: ${v.name}`);
          }
        }
      } catch (e: any) {
        console.log("  Kunne ikke liste serier:", e.message);
      }
    }

    reports.push({
      name: "Finansportalen – Boliglånsrenter",
      status: "❌",
      url: fpUrls[0],
      auth: "?",
      format: "Atom/XML (utilgjengelig)",
      frequency: "?",
      lastDatapoint: "N/A",
      exampleValue: "Feed returnerer HTML – trolig nedlagt eller endret URL",
      quality: "Utilgjengelig via API",
      gotchas: "Finansportalen er nå under Forbrukerrådet, feed-URL kan ha endret seg",
    });
  }
}

// ─── 6. Kraftpriser ─────────────────────────────────────────────────────────

async function kraftpriser() {
  header("6. KRAFTPRISER – Strømpris per prisområde");

  // Bruk hvakosterstrommen.no API (vanlig offentlig kilde)
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const areas = ["NO1", "NO2", "NO3", "NO4", "NO5"];

  let anySuccess = false;
  for (const area of areas) {
    const url = `https://www.hvakosterstrommen.no/api/v1/prices/${dateStr}_${area}.json`;
    const res = await tryFetch(url);
    if (res.ok && Array.isArray(res.data)) {
      anySuccess = true;
      const prices = res.data.map((p: any) => p.NOK_per_kWh);
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const current = res.data.find((p: any) => {
        const start = new Date(p.time_start);
        const end = new Date(p.time_end);
        return today >= start && today < end;
      });
      console.log(
        `  ${area}: Snitt i dag: ${(avg * 100).toFixed(1)} øre/kWh | Nå: ${current ? (current.NOK_per_kWh * 100).toFixed(1) : "?"} øre/kWh | ${res.data.length} timeverdier`
      );
    } else {
      // Prøv gårsdagen
      const yesterday = new Date(today.getTime() - 86400000);
      const yDateStr = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      const yUrl = `https://www.hvakosterstrommen.no/api/v1/prices/${yDateStr}_${area}.json`;
      const yRes = await tryFetch(yUrl);
      if (yRes.ok && Array.isArray(yRes.data)) {
        anySuccess = true;
        const avg =
          yRes.data.reduce((a: number, b: any) => a + b.NOK_per_kWh, 0) /
          yRes.data.length;
        console.log(
          `  ${area} (i går): Snitt: ${(avg * 100).toFixed(1)} øre/kWh | ${yRes.data.length} timeverdier`
        );
      } else {
        console.log(`  ${area}: ❌ Ingen data`);
      }
    }
  }

  reports.push({
    name: "Kraftpriser (hvakosterstrommen.no)",
    status: anySuccess ? "✅" : "❌",
    url: `https://www.hvakosterstrommen.no/api/v1/prices/{dato}_{område}.json`,
    auth: "Kreves ikke",
    format: "JSON",
    frequency: "Daglig (timepriser publiseres ca. kl 13 for neste dag)",
    lastDatapoint: dateStr,
    exampleValue: "Se konsollutskrift per prisområde",
    quality: "Utmerket – gratis, enkel API",
    gotchas:
      "Neste dags priser kommer ca. 13:00. URL krever spesifikt datoformat.",
  });
}

// ─── 7. Brønnøysundregistrene ───────────────────────────────────────────────

async function brreg() {
  header("7. BRØNNØYSUNDREGISTRENE – Konkurser og nyetableringer");

  // Konkurser
  subheader("Konkurser");
  // Brreg: sort by registreringsdatoEnhetsregisteret (not registrertIEnhetsregisteret)
  const konkursUrl =
    "https://data.brreg.no/enhetsregisteret/api/enheter?konkurs=true&size=10&sort=registreringsdatoEnhetsregisteret,desc";
  const konkurser = await tryFetch(konkursUrl, {
    headers: { Accept: "application/json" },
  });
  if (konkurser.ok) {
    const enheter =
      konkurser.data?._embedded?.enheter || konkurser.data?.enheter || [];
    console.log(`  Siste konkurser (${enheter.length} stk):`);
    for (const e of enheter.slice(0, 10)) {
      console.log(
        `    ${e.navn} | Org: ${e.organisasjonsnummer} | Registrert: ${e.registreringsdatoEnhetsregisteret || "?"} | Type: ${e.organisasjonsform?.beskrivelse || "?"}`
      );
      if (e.naeringskode1) {
        console.log(`      Bransje: ${e.naeringskode1.beskrivelse}`);
      }
    }
    reports.push({
      name: "Brreg – Konkurser",
      status: enheter.length > 0 ? "✅" : "🟡",
      url: konkursUrl,
      auth: "Kreves ikke",
      format: "JSON (HAL)",
      frequency: "Daglig",
      lastDatapoint: enheter[0]?.registrertIEnhetsregisteret || "?",
      exampleValue: enheter[0]
        ? `${enheter[0].navn} (${enheter[0].registrertIEnhetsregisteret})`
        : "?",
      quality: "God – offisielt register",
      gotchas:
        "Konkursfeltet er J/N. HAL-format med _embedded. Paginering via page/size.",
    });
  } else {
    console.log("  ❌ Feil:", konkurser.error);
    console.log("  Begge URL-varianter feilet");
  }

  // Nyregistreringer
  subheader("Nyregistreringer");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const startStr = startDate.toISOString().split("T")[0];
  const nyregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?fraRegistreringsdatoEnhetsregisteret=${startStr}&size=10&sort=registreringsdatoEnhetsregisteret,desc`;
  const nyreg = await tryFetch(nyregUrl, {
    headers: { Accept: "application/json" },
  });
  if (nyreg.ok) {
    const enheter =
      nyreg.data?._embedded?.enheter || nyreg.data?.enheter || [];
    const total = nyreg.data?.page?.totalElements || enheter.length;
    console.log(
      `  Nyregistrerte siste 14 dager: ${total} totalt (viser ${enheter.length}):`
    );
    for (const e of enheter.slice(0, 10)) {
      console.log(
        `    ${e.navn} | ${e.organisasjonsform?.beskrivelse || "?"} | ${e.registreringsdatoEnhetsregisteret || "?"}`
      );
    }
    reports.push({
      name: "Brreg – Nyregistreringer",
      status: "✅",
      url: nyregUrl,
      auth: "Kreves ikke",
      format: "JSON (HAL)",
      frequency: "Daglig",
      lastDatapoint: enheter[0]?.registrertIEnhetsregisteret || "?",
      exampleValue: `${total} nye enheter siste 14 dager`,
      quality: "Utmerket – komplett register",
      gotchas: "Bruk .fra/.til for datofiltrering, ikke .gte",
    });
  } else {
    console.log("  ❌ Feil:", nyreg.error);
  }
}

// ─── 8. Sokkeldirektoratet ──────────────────────────────────────────────────

async function sodir() {
  header("8. SOKKELDIREKTORATET – Oljeproduksjon");

  const urls = [
    "https://factpages.sodir.no/external/rest/field/production-yearly-total?format=json",
    "https://factpages.sodir.no/api/table/field/production/saleable/monthly?format=json",
    "https://factpages.sodir.no/api/table/field/production/monthly/last?format=json",
    "https://factpages.sodir.no/external/rest/field?format=json",
    "https://hotell.difi.no/api/json/npd/field/production-monthly-saleable?page=0",
  ];

  let found = false;
  for (const url of urls) {
    subheader(`Prøver: ${url.substring(0, 80)}...`);
    const res = await tryFetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      console.log("  ✅ Data mottatt!");
      const preview =
        typeof res.data === "string"
          ? res.data.substring(0, 500)
          : JSON.stringify(res.data, null, 2).substring(0, 500);
      console.log("  Utdrag:", preview);
      found = true;
      reports.push({
        name: "Sokkeldirektoratet – Oljeproduksjon",
        status: "✅",
        url,
        auth: "Kreves ikke",
        format: "JSON",
        frequency: "Månedlig",
        lastDatapoint: "Se data",
        exampleValue: "Se konsollutskrift",
        quality: "God – offisiell kilde",
        gotchas: "API-struktur kan variere",
      });
      break;
    } else {
      console.log(`  ❌ ${res.error}`);
    }
  }

  if (!found) {
    // Prøv CSV-nedlasting
    console.log("\n  Prøver å finne nedlastbar CSV...");
    const csvUrl =
      "https://factpages.sodir.no/en/field/TableView/Production/Saleable/Monthly";
    const csv = await tryFetch(csvUrl, {
      headers: { Accept: "text/html" },
    });
    if (csv.ok) {
      const html = typeof csv.data === "string" ? csv.data : "";
      const downloadLink = html.match(/href="([^"]*\.csv[^"]*)"/);
      if (downloadLink) {
        console.log(`  CSV-nedlasting funnet: ${downloadLink[1]}`);
      } else {
        console.log(
          "  HTML-side lastet, men CSV-link ikke funnet automatisk"
        );
      }
    }

    // Prøv Sodir Open Data
    const openDataUrl =
      "https://factpages.sodir.no/external/rest/field/production/monthly?format=json";
    const od = await tryFetch(openDataUrl);
    if (od.ok) {
      console.log("  ✅ Open Data API fungerer!");
      console.log("  ", JSON.stringify(od.data).substring(0, 400));
      found = true;
    }

    reports.push({
      name: "Sokkeldirektoratet – Oljeproduksjon",
      status: found ? "🟡" : "❌",
      url: "Flere URL-er prøvd – se utskrift",
      auth: "Kreves ikke",
      format: "CSV/HTML (API usikkert)",
      frequency: "Månedlig",
      lastDatapoint: "?",
      exampleValue: "Data tilgjengelig via faktasider, men API usikkert",
      quality: "Data finnes, men tilgang er begrenset",
      gotchas:
        "Ingen klar REST-API. Data kan hentes via faktasider eller CSV-nedlasting.",
    });
  }
}

// ─── 9. Eurostat ────────────────────────────────────────────────────────────

async function eurostat() {
  header("9. EUROSTAT – Norge i europeisk kontekst");

  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_manr/M.RCH_A.CP00.NO+SE+DK+EA/?format=JSON&lastNObservations=12";
  const res = await tryFetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.ok) {
    try {
      const data = res.data;
      const geoIdx = data.dimension?.geo?.category?.index;
      const geoLabels = data.dimension?.geo?.category?.label;
      const timeIdx = data.dimension?.time?.category?.index;
      const timeLabels = Object.keys(data.dimension?.time?.category?.index || {}).sort();
      const values = data.value;

      console.log("  Inflasjon (HICP årlig endringsrate):");
      const geoKeys = Object.keys(geoIdx || {});
      const nDims = Object.keys(data.dimension || {}).length;
      const sizes = data.size;

      const numTime = Object.keys(timeIdx).length;
      for (const geo of geoKeys) {
        const geoI = geoIdx[geo];
        const label = geoLabels?.[geo] || geo;
        const lastTime = timeLabels[timeLabels.length - 1];
        const timeI = timeIdx[lastTime];
        const idx = geoI * numTime + timeI;
        const val = values[idx];
        console.log(`  ${label} (${geo}): ${val}% (${lastTime})`);
      }

      // Show last 12 months for Norway using correct flat index calculation
      const noIdx = geoIdx["NO"];
      if (noIdx !== undefined) {
        const recentTimeLabels = timeLabels.slice(-12);
        console.log("\n  Norge – siste 12 måneder:");
        // Flat index = geoIdx * numTimePeriods + timeIdx
        const numTime = Object.keys(timeIdx).length;
        for (const t of recentTimeLabels) {
          const tI = timeIdx[t];
          const idx = noIdx * numTime + tI;
          const val = values[idx];
          if (val !== undefined) {
            console.log(`    ${t}: ${val}%`);
          }
        }
      }

      reports.push({
        name: "Eurostat – Inflasjon (HICP)",
        status: "✅",
        url,
        auth: "Kreves ikke",
        format: "JSON-stat (SDMX)",
        frequency: "Månedlig",
        lastDatapoint: timeLabels[timeLabels.length - 1],
        exampleValue: `Norge: ${noIdx !== undefined ? values[noIdx * numTime + timeIdx[timeLabels[timeLabels.length - 1]]] : "?"}% (${timeLabels[timeLabels.length - 1]})`,
        quality: "Utmerket – standardisert, sammenlignbar",
        gotchas:
          "SDMX-JSON med flat value array. Indeksberegning kan være vanskelig.",
      });
    } catch (e: any) {
      console.log("  ⚠ Parsefeil:", e.message);
      console.log("  Rå:", JSON.stringify(res.data).substring(0, 500));
      reports.push({
        name: "Eurostat – Inflasjon (HICP)",
        status: "🟡",
        url,
        auth: "Kreves ikke",
        format: "JSON-stat (SDMX)",
        frequency: "Månedlig",
        lastDatapoint: "?",
        exampleValue: "Data mottatt, men parsing feilet",
        quality: "Data tilgjengelig, krever mer arbeid med parsing",
        gotchas: "Kompleks SDMX-struktur: " + e.message,
      });
    }
  } else {
    console.log("  ❌ Feil:", res.error);
    reports.push({
      name: "Eurostat – Inflasjon (HICP)",
      status: "❌",
      url,
      auth: "?",
      format: "?",
      frequency: "?",
      lastDatapoint: "?",
      exampleValue: "Feil: " + res.error,
      quality: "?",
      gotchas: res.error || "",
    });
  }
}

// ─── 10. Sammenstilling og rapport ──────────────────────────────────────────

function generateReport(): string {
  let md = "# Norsk økonomi – API-utforskning\n\n";
  md += `Generert: ${new Date().toISOString().split("T")[0]}\n\n`;

  md += "## Sammendrag\n\n";
  md += "| Kilde | Status | Format | Frekvens | Siste data | Auth |\n";
  md += "|-------|--------|--------|----------|------------|------|\n";
  for (const r of reports) {
    md += `| ${r.name} | ${r.status} | ${r.format} | ${r.frequency} | ${r.lastDatapoint} | ${r.auth} |\n`;
  }

  md += "\n## Detaljert rapport\n\n";
  for (const r of reports) {
    md += `### ${r.status} ${r.name}\n\n`;
    md += `- **URL:** \`${r.url}\`\n`;
    md += `- **Autentisering:** ${r.auth}\n`;
    md += `- **Format:** ${r.format}\n`;
    md += `- **Oppdateringsfrekvens:** ${r.frequency}\n`;
    md += `- **Siste datapunkt:** ${r.lastDatapoint}\n`;
    md += `- **Eksempelverdi:** ${r.exampleValue}\n`;
    md += `- **Kvalitet:** ${r.quality}\n`;
    md += `- **Gotchas:** ${r.gotchas}\n\n`;
  }

  md += "## Mangler og begrensninger\n\n";
  md += "### Datapunkter uten godt API\n\n";
  md += "- **NBIM Oljefondet:** Ingen bekreftet åpent REST-API. Verdi må scrapes fra nbim.no eller hentes fra nyhetssaker.\n";
  md += "- **NAV registrert ledighet:** Ingen samlet REST-API. Data finnes via SSB-tabeller eller nav.no/statistikk.\n";
  md += "- **Sokkeldirektoratet:** API-tilgang usikker. Data kan lastes ned som CSV fra faktasider.\n";
  md += "- **Rentebane/prognose:** Norges Banks prognoser publiseres kun i PPR-rapporten, ikke via API.\n\n";

  md += "### Krever manuelt arbeid eller scraping\n\n";
  md += "- NBIM fondets daglige verdi\n";
  md += "- NAV detaljert ledighetsstatistikk per kommune\n";
  md += "- Sokkeldirektoratets produksjonsdata (CSV-nedlasting)\n\n";

  md += "### Alternative kilder å undersøke\n\n";
  md += "- **Oslo Børs (Euronext):** Aksjeindekser (OSEBX). Krever trolig betalt API eller scraping.\n";
  md += "- **Eiendom Norge:** Boligprisstatistikk (månedlig, mer oppdatert enn SSB). Sjekk eiendomnorge.no.\n";
  md += "- **Skatteetaten:** Skatteinngang. Begrenset API.\n";
  md += "- **Toll/SSB:** Import/eksport-statistikk.\n";
  md += "- **Finans Norge:** Bankstatistikk, utlånsvolum.\n";
  md += "- **OECD:** Sammenligningsdata (iData API).\n\n";

  md += "## Tekniske notater\n\n";
  md += "- **SSB API** er det mest krevende å jobbe med (POST + JSON-stat2), men har bredest dekning.\n";
  md += "- **Norges Bank SDMX-JSON** er standard men krever kjennskap til dimensjonsstruktur.\n";
  md += "- **Brreg** har det enkleste og mest velstrukturerte API-et (REST + HAL).\n";
  md += "- **Kraftpriser** via hvakosterstrommen.no er enklest å konsumere (ren JSON per time).\n";
  md += "- Alle API-er som fungerer er gratis og krever ikke autentisering.\n";

  return md;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║   NORSK ØKONOMI – API-UTFORSKNING                                          ║");
  console.log("║   Utforsker tilgjengelige datakilder for sanntids-dashbord                  ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");

  await norgesBank();
  await ssb();
  await nbim();
  await nav();
  await finansportalen();
  await kraftpriser();
  await brreg();
  await sodir();
  await eurostat();

  // Generate and save report
  header("10. SAMMENSTILLING");
  const report = generateReport();
  writeFileSync("økonomi-utforskning.md", report, "utf-8");
  console.log("\n  Rapport lagret som: økonomi-utforskning.md");

  // Print summary table
  console.log("\n  Oppsummering:");
  console.log(
    "  " + "─".repeat(76)
  );
  console.log(
    `  ${"Kilde".padEnd(40)} ${"Status".padEnd(8)} ${"Format".padEnd(15)} Auth`
  );
  console.log(
    "  " + "─".repeat(76)
  );
  for (const r of reports) {
    console.log(
      `  ${r.name.padEnd(40)} ${r.status.padEnd(6)}   ${r.format.padEnd(15)} ${r.auth}`
    );
  }
  console.log(
    "  " + "─".repeat(76)
  );

  const ok = reports.filter((r) => r.status === "✅").length;
  const partial = reports.filter((r) => r.status === "🟡").length;
  const fail = reports.filter((r) => r.status === "❌").length;
  console.log(
    `\n  Totalt: ${ok} ✅ fungerer | ${partial} 🟡 delvis | ${fail} ❌ feilet`
  );
}

main().catch((e) => {
  console.error("Fatal feil:", e);
  process.exit(1);
});
