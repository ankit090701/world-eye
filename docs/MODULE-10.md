# Module 10 — Satellite Intelligence

Live orbital tracking: satellites, the ISS, Starlink, space debris and recent
launches, propagated in real time in the browser, with ground-track orbits. Free &
keyless (CelesTrak TLEs + satellite.js SGP4).

---

## How to run

```bash
npm install      # from repo root  (installs satellite.js)
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** to fetch TLEs.

> No API keys. Orbital elements from **CelesTrak**; propagation with **satellite.js**.

---

## Feature walkthrough & test checklist

- [ ] Open the **Satellites** panel (satellite icon, left dock). **ISS & stations**
      and **Notable satellites** load automatically — watch the dots move (they update
      every second).
- [ ] Toggle the other groups: **Starlink**, **Space debris**, **Recent launches**.
      Each shows a live count (and *sim* if a fallback was used).
- [ ] **Select a satellite** — click a dot on the map, or a row in the list. The panel
      shows its **altitude, speed, orbital period, inclination and live lat/lon**
      (all updating each second), and its **orbit ground track** is drawn on the map.
- [ ] The **ISS** should read ~410–420 km altitude, ~7.6 km/s, ~93 min period, 51.6°
      inclination — a good correctness check.
- [ ] **Search** by name (e.g. `ISS`, `HUBBLE`) or NORAD id; click a result to fly to
      it and select it.
- [ ] Toggle **Orbit path** off/on; switch basemap — satellites and orbit persist.
- [ ] Modules 1–9 still work: aircraft/ships/trains/traffic/cyber/domain/weather all
      run alongside the satellites; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                         apps/api (Express, :8787)
──────────────────                         ─────────────────────────
SatellitePanel ── toggles/select           /api/satellites/tle?group=  → CelesTrak GP (TLE)
SatelliteEngine                              (proxy · sample · cache 2h · last-known-good)
  • fetch TLEs for enabled groups
  • satellite.js SGP4 propagate @ 1 Hz  ─▶ satelliteStore (positions + orbit segments)
SatelliteSync ▶ map source (per-group circle layers + orbit line + selected halo)
SatelliteInteractions ▶ click → select + popup
```

- **Client-side propagation.** The API only fetches, parses, samples and caches TLE
  element sets. The browser builds SGP4 satrecs with **satellite.js** and propagates
  every registered object to "now" **once per second**, computing real geodetic
  position, altitude and speed — so satellites move smoothly with zero server load.
- **Groups load on demand.** Each group's TLEs are fetched only when its layer is
  enabled, then its objects join the propagation registry; disabling a group drops
  them. ISS + notable satellites are on by default.
- **Orbit ground track.** When a satellite is selected, its track over one full
  orbital period is propagated and drawn, split at the ±180° antimeridian so the line
  doesn't smear across the map.
- **Same map plumbing as Modules 1–9** — the satellite sources/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump; positions repopulate
  from the store after a basemap switch.

### Sampling & throttle handling

- Big groups are **evenly sampled** server-side (Starlink → 300, debris → 300,
  launches → 300, notable → 200) so ~1,000 objects propagate smoothly at 1 Hz.
- **CelesTrak throttle.** CelesTrak updates its data every 2 h and returns **HTTP 403**
  ("data has not updated since your last download") if you refetch a group sooner.
  WorldEye caches each group for 2 h and keeps a **last-known-good** set, so a throttle
  or transient error is served from the last good data rather than going blank. The ISS
  has a bundled fallback element set if CelesTrak is entirely unreachable.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/satellites/*`, `/api/satellites/tle` in `apps/api/src/index.ts` |
| Propagation | `apps/web/src/lib/satprop.ts` (satellite.js wrappers) |
| Data / state | `apps/web/src/data/satelliteStore.ts`, `store/satelliteSlice.ts`, `api/satelliteApi.ts` |
| Map | `apps/web/src/map/satellites/SatelliteLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/SatellitePanel.tsx` |

---

## Notes / limitations

- **satellite.js v5** (pure-JS SGP4) is used deliberately — v7 ships a WASM build that
  doesn't bundle for the browser. v5's API and accuracy are identical for our use.
- **Sampled constellations.** Starlink has ~10,000 objects; rendering all of them at
  1 Hz would be heavy, so WorldEye samples evenly. It's an operational overview, not a
  complete catalog.
- **TLE freshness.** Element sets update a few times per day; propagation accuracy is
  excellent near the epoch and degrades over days — WorldEye refreshes within CelesTrak's
  2 h window.
- **Debris** uses the Cosmos-2251 breakup catalog as a representative, well-tracked
  debris field (sampled).
