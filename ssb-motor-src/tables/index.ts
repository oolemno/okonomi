/**
 * Re-eksport av alle ferdige tabelldefinisjoner.
 */

// Økonomi
export { fetchKPI } from "./kpi.js";
export type { KPIPoint, KPIResult } from "./kpi.js";

export { fetchBoligpris } from "./boligpris.js";
export type { BoligprisPoint, BoligprisResult } from "./boligpris.js";

export { fetchArbeidsledighet, fetchArbeidsledighetKommune } from "./arbeidsmarked.js";
export type {
  ArbeidsledighetPoint,
  ArbeidsledighetResult,
  ArbeidsledighetKommunePoint,
} from "./arbeidsmarked.js";

export { fetchLonnsvekst } from "./lonn.js";
export type { LonnPoint, LonnResult } from "./lonn.js";

// Kommune
export { fetchBefolkning, fetchAldersfordeling } from "./befolkning.js";
export type {
  BefolkningPoint,
  BefolkningResult,
  AldersfordelingPoint,
} from "./befolkning.js";

export { fetchBefolkningFramskriving } from "./befolkning-framskriving.js";
export type {
  FramskrivingPoint,
  FramskrivingResult,
} from "./befolkning-framskriving.js";

export { fetchFlytting } from "./flytting.js";
export type { FlyttingPoint, FlyttingResult } from "./flytting.js";

export { fetchMedianInntekt } from "./inntekt.js";
export type { InntektPoint, InntektResult } from "./inntekt.js";

export { fetchKOSTRA, fetchKOSTRAUtgifter, fetchKommunaleGebyrer } from "./kostra.js";
export type {
  KOSTRAUtgifterPoint,
  KommunaleGebyrerResult,
} from "./kostra.js";

export { fetchNaringsstruktur } from "./naring.js";
export type { NaringsstrukturPoint, NaringsstrukturResult } from "./naring.js";

export { fetchArealbruk } from "./areal.js";
export type { ArealbrukPoint } from "./areal.js";

export { fetchBoligbygging } from "./boligbygging.js";
export type { BoligbyggingPoint } from "./boligbygging.js";

export { fetchKjoretoy } from "./kjoretoy.js";
export type { KjoretoyPoint } from "./kjoretoy.js";

export { fetchBarnehage } from "./barnehage.js";

export { fetchInnvandring } from "./innvandring.js";

export { fetchPendling } from "./pendling.js";
