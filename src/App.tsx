import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEconomyData, type AsyncData } from "./useEconomyData";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined, decimals = 1): string {
  const num = Number(n);
  if (isNaN(num)) return "–";
  return num.toFixed(decimals).replace(".", ",");
}
function fmtKr(n: number | string | null | undefined): string {
  const num = Number(n);
  if (isNaN(num)) return "–";
  return Math.round(num).toLocaleString("no-NO");
}

function TrendArrow({ value, invert }: { value: number; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const color = value === 0 ? "text-(--color-neutral)" : positive ? "text-(--color-positive)" : "text-(--color-negative)";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {fmt(Math.abs(value))}%
    </span>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ h = "h-12" }: { h?: string }) {
  return <div className={`${h} bg-(--color-card-border) rounded-lg animate-pulse`} />;
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-(--color-negative) opacity-70">{msg}</p>;
}

// ─── Cards ──────────────────────────────────────────────────────────────────

const cardClass =
  "bg-(--color-card) border border-(--color-card-border) rounded-2xl p-5";

function HeroCard({
  label,
  value,
  sub,
  loading,
  error,
}: {
  label: string;
  value?: string;
  sub?: React.ReactNode;
  loading: boolean;
  error?: string;
}) {
  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorMsg msg="Kunne ikke hente" />
      ) : (
        <>
          <div className="text-[44px] leading-tight font-bold mt-1 tracking-tight">
            {value}
          </div>
          {sub && <div className="mt-1">{sub}</div>}
        </>
      )}
    </div>
  );
}

function SmallCard({
  label,
  value,
  sub,
  loading,
  error,
}: {
  label: string;
  value?: string;
  sub?: React.ReactNode;
  loading: boolean;
  error?: string;
}) {
  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </div>
      {loading ? (
        <Skeleton h="h-8" />
      ) : error ? (
        <ErrorMsg msg="Feil" />
      ) : (
        <>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {sub && (
            <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SparkCard ──────────────────────────────────────────────────────────────

function SparkCard({
  label,
  value,
  change,
  history,
  sub,
  loading,
  error,
}: {
  label: string;
  value?: string;
  change?: number;
  history?: Array<{ value: number }>;
  sub?: React.ReactNode;
  loading: boolean;
  error?: string;
}) {
  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </div>
      {loading ? (
        <Skeleton h="h-14" />
      ) : error ? (
        <ErrorMsg msg="Kunne ikke hente" />
      ) : (
        <div className="flex items-end justify-between gap-2 mt-1">
          <div className="min-w-0">
            <div className="text-2xl font-semibold leading-tight truncate">
              {value}
            </div>
            <div className="mt-0.5 text-sm">
              {change !== undefined ? (
                <TrendArrow value={change} />
              ) : (
                sub
              )}
            </div>
          </div>
          {history && history.length > 2 && (
            <div className="w-20 h-10 flex-shrink-0 opacity-75">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chart ──────────────────────────────────────────────────────────────────

function KursChart({
  data,
}: {
  data: AsyncData<import("./api").KronekursData>;
}) {
  if (data.status === "loading") return <div className={cardClass}><Skeleton h="h-48" /></div>;
  if (data.status === "error") return null;

  const eur = data.data["EUR"];
  if (!eur) return null;

  const chartData = eur.history.map((h) => ({
    date: h.date.slice(5), // MM-DD
    kurs: h.rate,
  }));

  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
        EUR/NOK siste 30 dager
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(chartData.length / 5)}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2a2d37",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(v: number | string) => [typeof v === "number" ? v.toFixed(4) : String(v), "EUR/NOK"]}
          />
          <Line
            type="monotone"
            dataKey="kurs"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Naboland tabell ────────────────────────────────────────────────────────

function NabolandTable({
  data,
}: {
  data: AsyncData<import("./api").EurostatRow[]>;
}) {
  if (data.status === "loading") return <div className={cardClass}><Skeleton h="h-32" /></div>;
  if (data.status === "error") return null;

  const rows = data.data;

  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
        Inflasjon – Norden & Eurosonen
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs">
            <th className="text-left font-medium pb-2">Land</th>
            <th className="text-right font-medium pb-2">HICP</th>
            <th className="text-right font-medium pb-2">Periode</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.geo}
              className={r.geo === "NO" ? "text-white font-semibold" : "text-gray-400"}
            >
              <td className="py-1">{r.name}</td>
              <td className="text-right py-1">
                {r.rate != null ? `${fmt(r.rate)}%` : "–"}
              </td>
              <td className="text-right py-1 text-gray-500">{r.month}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Kraftpris ──────────────────────────────────────────────────────────────

function KraftprisRow({
  data,
}: {
  data: AsyncData<import("./api").KraftprisData>;
}) {
  if (data.status === "loading") return <div className={cardClass}><Skeleton h="h-16" /></div>;
  if (data.status === "error") return null;

  const areas = Object.entries(data.data);
  if (areas.length === 0) return null;

  return (
    <div className={cardClass}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
        Strømpris i dag (øre/kWh)
      </div>
      <div className="flex justify-between gap-2">
        {areas.map(([area, d]) => (
          <div key={area} className="text-center flex-1">
            <div className="text-xs text-gray-500">{area}</div>
            <div className="text-lg font-semibold">
              {d.current != null ? fmt(d.current, 0) : fmt(d.avg, 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const { kpi, bolig, ledighet, lonn, rente, kurs, brreg, eurostat, kraft, osebx, brent, nbim } =
    useEconomyData();

  // Derive hero values
  const renteValue =
    rente.status === "ok" ? `${fmt(rente.data.rate, 2)}%` : undefined;

  let inflationValue: string | undefined;
  let inflationChange: React.ReactNode;
  if (kpi.status === "ok") {
    const latest = kpi.data.latest;
    if (latest.yearlyChange != null && !isNaN(Number(latest.yearlyChange))) {
      inflationValue = `${fmt(latest.yearlyChange)}%`;
    } else {
      // Calculate from data
      const data = kpi.data.data;
      const curr = data[data.length - 1];
      const prev = data.length >= 13 ? data[data.length - 13] : null;
      if (prev && prev.index > 0) {
        const change = ((curr.index / prev.index - 1) * 100);
        inflationValue = `${fmt(change)}%`;
      }
    }
    // Month-over-month change
    const data = kpi.data.data;
    if (data.length >= 2) {
      const curr = data[data.length - 1];
      const prev = data[data.length - 2];
      const mom = ((curr.index / prev.index - 1) * 100);
      inflationChange = (
        <span className="text-sm text-gray-500">
          {mom >= 0 ? "+" : ""}{fmt(mom, 2)}% siste mnd
        </span>
      );
    }
  }

  const eurValue =
    kurs.status === "ok" && kurs.data["EUR"]
      ? fmt(kurs.data["EUR"].rate, 2)
      : undefined;
  let eurChange: React.ReactNode;
  if (kurs.status === "ok" && kurs.data["EUR"]) {
    const hist = kurs.data["EUR"].history;
    if (hist.length >= 2) {
      const diff =
        ((hist[hist.length - 1].rate / hist[hist.length - 2].rate - 1) * 100);
      eurChange = <TrendArrow value={diff} invert />;
    }
  }

  const ledighetValue =
    ledighet.status === "ok"
      ? `${fmt(ledighet.data.latest.ledighetsrate)}%`
      : undefined;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg font-semibold tracking-tight">Norsk økonomi</h1>
        <p className="text-xs text-gray-500">Sanntidsoversikt</p>
      </div>

      {/* Hero 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <HeroCard
          label="Styringsrente"
          value={renteValue}
          sub={
            rente.status === "ok" && (
              <span className="text-xs text-gray-500">{rente.data.date}</span>
            )
          }
          loading={rente.status === "loading"}
          error={rente.status === "error" ? rente.error : undefined}
        />
        <HeroCard
          label="Inflasjon (KPI)"
          value={inflationValue}
          sub={inflationChange}
          loading={kpi.status === "loading"}
          error={kpi.status === "error" ? kpi.error : undefined}
        />
        <HeroCard
          label="EUR/NOK"
          value={eurValue}
          sub={eurChange}
          loading={kurs.status === "loading"}
          error={kurs.status === "error" ? kurs.error : undefined}
        />
        <HeroCard
          label="Arbeidsledighet"
          value={ledighetValue}
          sub={
            ledighet.status === "ok" && (
              <span className="text-xs text-gray-500">
                AKU {ledighet.data.latest.period}
              </span>
            )
          }
          loading={ledighet.status === "loading"}
          error={ledighet.status === "error" ? ledighet.error : undefined}
        />
      </div>

      {/* Small cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <SmallCard
          label="Boligpris /m²"
          value={bolig.status === "ok" ? `${fmtKr(bolig.data.latest.kvmpris)} kr` : undefined}
          sub={
            bolig.status === "ok" && (
              <>
                {bolig.data.latest.quarter} · {bolig.data.data.length >= 2 && (
                  <TrendArrow
                    value={
                      ((bolig.data.latest.kvmpris /
                        bolig.data.data[bolig.data.data.length - 2].kvmpris -
                        1) *
                        100)
                    }
                  />
                )}
              </>
            )
          }
          loading={bolig.status === "loading"}
          error={bolig.status === "error" ? bolig.error : undefined}
        />
        <SmallCard
          label="Månedslønn"
          value={
            lonn.status === "ok"
              ? `${fmtKr(lonn.data.latest.manedslonn)} kr`
              : undefined
          }
          sub={
            lonn.status === "ok" && lonn.data.yearlyGrowthPercent != null && (
              <TrendArrow value={lonn.data.yearlyGrowthPercent} />
            )
          }
          loading={lonn.status === "loading"}
          error={lonn.status === "error" ? lonn.error : undefined}
        />
        <SmallCard
          label="Nye foretak (14d)"
          value={
            brreg.status === "ok"
              ? brreg.data.nyregistreringer.toLocaleString("no-NO")
              : undefined
          }
          loading={brreg.status === "loading"}
          error={brreg.status === "error" ? brreg.error : undefined}
        />
        <SmallCard
          label="Konkurser totalt"
          value={
            brreg.status === "ok"
              ? brreg.data.konkurser.toLocaleString("no-NO")
              : undefined
          }
          sub="I enhetsregisteret"
          loading={brreg.status === "loading"}
          error={brreg.status === "error" ? brreg.error : undefined}
        />
      </div>

      {/* Markeder – OSEBX, Brent, Oljefond */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard
          label="Oslo Børs"
          value={osebx.status === "ok" ? fmtKr(osebx.data.price) : undefined}
          change={
            osebx.status === "ok"
              ? ((osebx.data.price / osebx.data.previousClose - 1) * 100)
              : undefined
          }
          history={osebx.status === "ok" ? osebx.data.history : undefined}
          loading={osebx.status === "loading"}
          error={osebx.status === "error" ? osebx.error : undefined}
        />
        <SparkCard
          label="Brent crude"
          value={
            brent.status === "ok"
              ? `$${fmt(brent.data.price, 1)}`
              : undefined
          }
          change={
            brent.status === "ok"
              ? ((brent.data.price / brent.data.previousClose - 1) * 100)
              : undefined
          }
          history={brent.status === "ok" ? brent.data.history : undefined}
          loading={brent.status === "loading"}
          error={brent.status === "error" ? brent.error : undefined}
        />
      </div>
      <SparkCard
        label="Oljefondet"
        value={
          nbim.status === "ok"
            ? `${fmtKr(nbim.data.valueBillions)} mrd kr`
            : undefined
        }
        sub={
          nbim.status === "ok" ? (
            <span className="text-gray-500">
              {nbim.data.isRaised === 1 ? (
                <span className="text-(--color-positive)">▲ stiger</span>
              ) : (
                <span className="text-(--color-negative)">▼ synker</span>
              )}{" "}
              · live
            </span>
          ) : undefined
        }
        loading={nbim.status === "loading"}
        error={nbim.status === "error" ? nbim.error : undefined}
      />

      {/* EUR/NOK chart */}
      <KursChart data={kurs} />

      {/* Naboland */}
      <NabolandTable data={eurostat} />

      {/* Kraftpris */}
      <KraftprisRow data={kraft} />

      {/* Footer */}
      <p className="text-[10px] text-gray-600 text-center pt-2">
        Kilder: Norges Bank · SSB · Brreg · Eurostat · NBIM · Yahoo Finance · hvakosterstrommen.no
      </p>
    </div>
  );
}
