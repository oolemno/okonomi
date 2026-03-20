# Norsk økonomi – API-utforskning

Generert: 2026-03-19

## Sammendrag

| Kilde | Status | Format | Frekvens | Siste data | Auth |
|-------|--------|--------|----------|------------|------|
| Norges Bank – Styringsrente | ✅ | SDMX-JSON | Ved endring (ca. 8 ganger/år) | 2026-03-18 | Kreves ikke |
| Norges Bank – Valutakurser | ✅ | SDMX-JSON | Daglig (bankdager) | 2026-03-19 | Kreves ikke |
| Norges Bank – NIBOR 3 mnd | ✅ | SDMX-JSON | Daglig (bankdager) | 2025-12-23 | Kreves ikke |
| SSB – KPI totalindeks | ✅ | JSON-stat2 (POST) | Månedlig (ca. 10. i måneden) | 2025M12 | Kreves ikke |
| SSB – Boligprisindeks | ✅ | JSON-stat2 (POST) | Kvartalsvis | 2024K4 | Kreves ikke |
| SSB – Arbeidsledighet (AKU) | ✅ | JSON-stat2 (POST) | Månedlig (glidende gjennomsnitt) | 2025 | Kreves ikke |
| SSB – Lønnsvekst | ✅ | JSON-stat2 (POST) | Årlig | 2025 | Kreves ikke |
| NBIM – Oljefondet | ❌ | N/A | Daglig (på websiden) | N/A | N/A |
| NAV – Arbeidsmarked | 🟡 | JSON/HTML | Månedlig (statistikk), daglig (stillinger) | Varierer | Varierer |
| Finansportalen – Boliglånsrenter | ❌ | Atom/XML (utilgjengelig) | ? | N/A | ? |
| Kraftpriser (hvakosterstrommen.no) | ✅ | JSON | Daglig (timepriser publiseres ca. kl 13 for neste dag) | 2026/03-19 | Kreves ikke |
| Brreg – Konkurser | ✅ | JSON (HAL) | Daglig | ? | Kreves ikke |
| Brreg – Nyregistreringer | ✅ | JSON (HAL) | Daglig | ? | Kreves ikke |
| Sokkeldirektoratet – Oljeproduksjon | ❌ | CSV/HTML (API usikkert) | Månedlig | ? | Kreves ikke |
| Eurostat – Inflasjon (HICP) | ✅ | JSON-stat (SDMX) | Månedlig | 2025-12 | Kreves ikke |

## Detaljert rapport

### ✅ Norges Bank – Styringsrente

- **URL:** `https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=sdmx-json&lastNObservations=10`
- **Autentisering:** Kreves ikke
- **Format:** SDMX-JSON
- **Oppdateringsfrekvens:** Ved endring (ca. 8 ganger/år)
- **Siste datapunkt:** 2026-03-18
- **Eksempelverdi:** Styringsrente: 4% (per 2026-03-18)
- **Kvalitet:** Utmerket – offisiell kilde
- **Gotchas:** SDMX-JSON er kompleks å parse

### ✅ Norges Bank – Valutakurser

- **URL:** `https://data.norges-bank.no/api/data/EXR/B.EUR+USD+SEK.NOK.SP?format=sdmx-json&lastNObservations=30`
- **Autentisering:** Kreves ikke
- **Format:** SDMX-JSON
- **Oppdateringsfrekvens:** Daglig (bankdager)
- **Siste datapunkt:** 2026-03-19
- **Eksempelverdi:** Se konsollutskrift for kurser
- **Kvalitet:** Utmerket – offisiell kilde
- **Gotchas:** Ingen data i helger/helligdager

### ✅ Norges Bank – NIBOR 3 mnd

- **URL:** `https://data.norges-bank.no/api/data/SHORT_RATES/B.NOWA_AVERAGE.3M.R?format=sdmx-json&lastNObservations=10`
- **Autentisering:** Kreves ikke
- **Format:** SDMX-JSON
- **Oppdateringsfrekvens:** Daglig (bankdager)
- **Siste datapunkt:** 2025-12-23
- **Eksempelverdi:** NIBOR 3M: 4.01931% (per 2025-12-23)
- **Kvalitet:** Utmerket
- **Gotchas:** Samme SDMX-format

### ✅ SSB – KPI totalindeks

- **URL:** `https://data.ssb.no/api/v0/no/table/03013`
- **Autentisering:** Kreves ikke
- **Format:** JSON-stat2 (POST)
- **Oppdateringsfrekvens:** Månedlig (ca. 10. i måneden)
- **Siste datapunkt:** 2025M12
- **Eksempelverdi:** KPI: 139.1 (2025M12)
- **Kvalitet:** Utmerket – offisiell statistikk
- **Gotchas:** POST request med JSON body påkrevd

### ✅ SSB – Boligprisindeks

- **URL:** `https://data.ssb.no/api/v0/no/table/07241`
- **Autentisering:** Kreves ikke
- **Format:** JSON-stat2 (POST)
- **Oppdateringsfrekvens:** Kvartalsvis
- **Siste datapunkt:** 2024K4
- **Eksempelverdi:** Kvm-pris: 61 365 kr (2024K4)
- **Kvalitet:** God – offisiell statistikk
- **Gotchas:** Kun kvartalsvis. Tabell 07241 har ikke regiondimensjon – bruk 13655 for regionale data.

### ✅ SSB – Arbeidsledighet (AKU)

- **URL:** `https://data.ssb.no/api/v0/no/table/05111`
- **Autentisering:** Kreves ikke
- **Format:** JSON-stat2 (POST)
- **Oppdateringsfrekvens:** Månedlig (glidende gjennomsnitt)
- **Siste datapunkt:** 2025
- **Eksempelverdi:** Ledighet: 4.5% (2025)
- **Kvalitet:** God – AKU-basert
- **Gotchas:** Glidende 3-måneders gjennomsnitt, ikke enkeltmåned

### ✅ SSB – Lønnsvekst

- **URL:** `https://data.ssb.no/api/v0/no/table/11418`
- **Autentisering:** Kreves ikke
- **Format:** JSON-stat2 (POST)
- **Oppdateringsfrekvens:** Årlig
- **Siste datapunkt:** 2025
- **Eksempelverdi:** Lønn: 62 070 kr (2025)
- **Kvalitet:** God
- **Gotchas:** Kun årstall, ikke kvartalsvis

### ❌ NBIM – Oljefondet

- **URL:** `Ingen fungerende API funnet`
- **Autentisering:** N/A
- **Format:** N/A
- **Oppdateringsfrekvens:** Daglig (på websiden)
- **Siste datapunkt:** N/A
- **Eksempelverdi:** Krever scraping eller manuell henting
- **Kvalitet:** Data finnes, men ikke via åpent API
- **Gotchas:** Må scrape fra nbim.no eller finne alternativ datakilde

### 🟡 NAV – Arbeidsmarked

- **URL:** `Diverse – se utskrift`
- **Autentisering:** Varierer
- **Format:** JSON/HTML
- **Oppdateringsfrekvens:** Månedlig (statistikk), daglig (stillinger)
- **Siste datapunkt:** Varierer
- **Eksempelverdi:** Se konsollutskrift
- **Kvalitet:** Begrenset API-tilgang – hoveddata via SSB eller nav.no statistikk
- **Gotchas:** NAV mangler et samlet åpent REST-API for ledighetsstatistikk

### ❌ Finansportalen – Boliglånsrenter

- **URL:** `https://www.finansportalen.no/feed/v3/bank/boliglan.atom`
- **Autentisering:** ?
- **Format:** Atom/XML (utilgjengelig)
- **Oppdateringsfrekvens:** ?
- **Siste datapunkt:** N/A
- **Eksempelverdi:** Feed returnerer HTML – trolig nedlagt eller endret URL
- **Kvalitet:** Utilgjengelig via API
- **Gotchas:** Finansportalen er nå under Forbrukerrådet, feed-URL kan ha endret seg

### ✅ Kraftpriser (hvakosterstrommen.no)

- **URL:** `https://www.hvakosterstrommen.no/api/v1/prices/{dato}_{område}.json`
- **Autentisering:** Kreves ikke
- **Format:** JSON
- **Oppdateringsfrekvens:** Daglig (timepriser publiseres ca. kl 13 for neste dag)
- **Siste datapunkt:** 2026/03-19
- **Eksempelverdi:** Se konsollutskrift per prisområde
- **Kvalitet:** Utmerket – gratis, enkel API
- **Gotchas:** Neste dags priser kommer ca. 13:00. URL krever spesifikt datoformat.

### ✅ Brreg – Konkurser

- **URL:** `https://data.brreg.no/enhetsregisteret/api/enheter?konkurs=true&size=10&sort=registreringsdatoEnhetsregisteret,desc`
- **Autentisering:** Kreves ikke
- **Format:** JSON (HAL)
- **Oppdateringsfrekvens:** Daglig
- **Siste datapunkt:** 2025-12-29
- **Eksempelverdi:** BYGGMESTER NILS S. MATHISEN (2025-12-29), RUCHI NOTODDEN AS (2025-11-20)
- **Kvalitet:** God – offisielt register
- **Gotchas:** `konkurs=true` filter. HAL-format med `_embedded`. Paginering via `page`/`size`.

### ✅ Brreg – Nyregistreringer

- **URL:** `https://data.brreg.no/enhetsregisteret/api/enheter?fraRegistreringsdatoEnhetsregisteret=2026-03-05&size=10&sort=registreringsdatoEnhetsregisteret,desc`
- **Autentisering:** Kreves ikke
- **Format:** JSON (HAL)
- **Oppdateringsfrekvens:** Daglig
- **Siste datapunkt:** ?
- **Eksempelverdi:** 4523 nye enheter siste 14 dager
- **Kvalitet:** Utmerket – komplett register
- **Gotchas:** Bruk `fraRegistreringsdatoEnhetsregisteret` for datofiltrering. Sort: `registreringsdatoEnhetsregisteret,desc`

### ❌ Sokkeldirektoratet – Oljeproduksjon

- **URL:** `Flere URL-er prøvd – se utskrift`
- **Autentisering:** Kreves ikke
- **Format:** CSV/HTML (API usikkert)
- **Oppdateringsfrekvens:** Månedlig
- **Siste datapunkt:** ?
- **Eksempelverdi:** Data tilgjengelig via faktasider, men API usikkert
- **Kvalitet:** Data finnes, men tilgang er begrenset
- **Gotchas:** Ingen klar REST-API. Data kan hentes via faktasider eller CSV-nedlasting.

### ✅ Eurostat – Inflasjon (HICP)

- **URL:** `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_manr/M.RCH_A.CP00.NO+SE+DK+EA/?format=JSON&lastNObservations=12`
- **Autentisering:** Kreves ikke
- **Format:** JSON-stat (SDMX)
- **Oppdateringsfrekvens:** Månedlig
- **Siste datapunkt:** 2025-12
- **Eksempelverdi:** Norge: 3% (2025-12)
- **Kvalitet:** Utmerket – standardisert, sammenlignbar
- **Gotchas:** SDMX-JSON med flat value array. Indeksberegning kan være vanskelig.

## Mangler og begrensninger

### Datapunkter uten godt API

- **NBIM Oljefondet:** Ingen bekreftet åpent REST-API. Verdi må scrapes fra nbim.no eller hentes fra nyhetssaker.
- **NAV registrert ledighet:** Ingen samlet REST-API. Data finnes via SSB tabell 10540 (helt ledige per måned/region).
- **KPI-JAE (kjerneinflasjon):** Ikke funnet i SSB-tabellene 03013, 08981 eller 03014 via API. Kan finnes i andre tabeller eller beregnes manuelt.
- **Sokkeldirektoratet:** API-tilgang usikker. Data kan lastes ned som CSV fra faktasider.
- **Rentebane/prognose:** Norges Banks prognoser publiseres kun i PPR-rapporten, ikke via API.

### Krever manuelt arbeid eller scraping

- NBIM fondets daglige verdi
- NAV detaljert ledighetsstatistikk per kommune
- Sokkeldirektoratets produksjonsdata (CSV-nedlasting)

### Alternative kilder å undersøke

- **Oslo Børs (Euronext):** Aksjeindekser (OSEBX). Krever trolig betalt API eller scraping.
- **Eiendom Norge:** Boligprisstatistikk (månedlig, mer oppdatert enn SSB). Sjekk eiendomnorge.no.
- **Skatteetaten:** Skatteinngang. Begrenset API.
- **Toll/SSB:** Import/eksport-statistikk.
- **Finans Norge:** Bankstatistikk, utlånsvolum.
- **OECD:** Sammenligningsdata (iData API).

## Tekniske notater

- **SSB API** er det mest krevende å jobbe med (POST + JSON-stat2), men har bredest dekning. Tips: Hent metadata med GET først for å finne riktige variabelkoder.
- **Norges Bank SDMX-JSON** er standard men krever kjennskap til dimensjonsstruktur. Key-strukturen er `FREQ.INSTRUMENT_TYPE.TENOR.UNIT_MEASURE` for IR, og `FREQ.CURRENCY.TARGET_CURRENCY.TYPE` for EXR. Bruk `detail=serieskeysonly` for å utforske tilgjengelige serier.
- **NIBOR** publiseres ikke lenger direkte av Norges Bank – NOWA-gjennomsnitt (3M) finnes i SHORT_RATES dataflow, men ekte NIBOR-rater eies nå av Oslo Børs/NoRe Benchmarks.
- **Brreg** har det enkleste og mest velstrukturerte API-et (REST + HAL). Parameternavnene er på norsk (`fraRegistreringsdatoEnhetsregisteret`).
- **Kraftpriser** via hvakosterstrommen.no er enklest å konsumere (ren JSON per time).
- Alle API-er som fungerer er gratis og krever ikke autentisering.
- **Sokkeldirektoratet** hadde tidligere et åpent REST-API via `factpages.sodir.no/external/rest/`, men dette ser ut til å være avviklet. CSV-filer kan lastes ned manuelt fra faktasidene.
