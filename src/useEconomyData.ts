import { useState, useEffect } from "react";
import { SSBClient, fetchKPI, fetchBoligpris, fetchArbeidsledighet, fetchLonnsvekst } from "ssb-motor";
import type { KPIResult, BoligprisResult, ArbeidsledighetResult, LonnResult } from "ssb-motor";
import {
  fetchStyringsrente,
  fetchKronekurs,
  fetchBrregStats,
  fetchEurostatInflasjon,
  fetchKraftpris,
  fetchOsebx,
  fetchBrent,
  fetchNbim,
  type StyringsrenteData,
  type KronekursData,
  type BrregData,
  type EurostatRow,
  type KraftprisData,
  type YahooData,
  type NbimData,
} from "./api";

// ─── Generic async state ────────────────────────────────────────────────────

export type AsyncData<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

function useAsync<T>(fn: () => Promise<T>): AsyncData<T> {
  const [state, setState] = useState<AsyncData<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: "error", error: String(e) });
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useEconomyData() {
  // SSB client — cacheDuration 0 disables stale reads (fs is shimmed anyway)
  const [client] = useState(() => new SSBClient({ verbose: true, cacheDuration: 0 }));

  const kpi = useAsync<KPIResult>(() => fetchKPI(client, { months: 24 }));
  const bolig = useAsync<BoligprisResult>(() => fetchBoligpris(client));
  const ledighet = useAsync<ArbeidsledighetResult>(() => fetchArbeidsledighet(client));
  const lonn = useAsync<LonnResult>(() => fetchLonnsvekst(client));
  const rente = useAsync<StyringsrenteData>(() => fetchStyringsrente());
  const kurs = useAsync<KronekursData>(() => fetchKronekurs());
  const brreg = useAsync<BrregData>(() => fetchBrregStats());
  const eurostat = useAsync<EurostatRow[]>(() => fetchEurostatInflasjon());
  const kraft = useAsync<KraftprisData>(() => fetchKraftpris());
  const osebx = useAsync<YahooData>(() => fetchOsebx());
  const brent = useAsync<YahooData>(() => fetchBrent());
  const nbim = useAsync<NbimData>(() => fetchNbim());

  return { kpi, bolig, ledighet, lonn, rente, kurs, brreg, eurostat, kraft, osebx, brent, nbim };
}
