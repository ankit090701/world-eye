# Module 2 — Aircraft Tracking

Live flights on the WorldEye map, powered by free, keyless data sources with a
resilient simulated fallback.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # starts BOTH web (:5173) and API (:8787)
```

Open **http://localhost:5173** in a normal browser. The **API must be running**
for live aircraft (it is, under `npm run dev`).

> No API keys. Aircraft: adsb.lol · Route/airline/airports: adsbdb ·
> Weather radar: RainViewer.

---

## Feature walkthrough & test checklist

- [ ] On load, planes appear near the map centre. Zoom to a busy region
      (e.g. **London / Europe**) → 100+ **live** aircraft, each a plane icon
      **rotated to its heading**, coloured by **altitude** (cyan low → amber/red high).
- [ ] Open the **Aircraft** panel (plane icon, left dock). The header shows
      **Live ADS-B** (green) or **Simulated** (amber) + count + "updated Ns ago".
- [ ] **Click a plane** (or a row under *Nearby flights*) → panel shows the
      **Selected flight**: callsign, operator, **route** (origin → destination
      airports), **altitude / speed / heading / vertical rate**, **registration**,
      **type**, **squawk**, Mode-S hex.
- [ ] The selected aircraft grows a **cyan trail** (its Flight Path) as it moves.
- [ ] **Follow** button: the map keeps the selected aircraft centred as it flies.
      **Center** re-centres once.
- [ ] **Weather radar** toggle (panel or Layers) overlays **RainViewer**
      precipitation; adjust its opacity in the Layers panel.
- [ ] **Emergencies only** toggle filters to aircraft squawking 7500/7600/7700;
      any emergency is highlighted **red** and listed under *Emergency squawks*.
- [ ] Status bar (bottom) shows a live **✈ count** (green when live).
- [ ] Switch basemaps (Layers panel) — planes, trails and weather **persist**
      across the style change.

### Verifying the fallback
Stop the API (`Ctrl-C` the `api` process) — the panel shows **Feed offline**,
then within a poll it serves a **Simulated** feed so planes keep moving. Restart
`npm run dev:api` to return to live data.

---

## Architecture

```
Browser (apps/web)                         apps/api (Express, :8787)
──────────────────                         ─────────────────────────
AircraftEngine  ── GET /api/aircraft ─────▶ /aircraft  ┌─ adsb.lol (live ADS-B)
  (polls per viewport, 10s + on move)                  └─ simulator (fallback)
AircraftSync    ── renders GeoJSON ▶ map               /aircraft/route/:cs ─▶ adsbdb
AircraftPanel   ── GET /route,/meta ─────▶ /aircraft/meta/:id  ─▶ adsbdb
WeatherOverlay  ── RainViewer tiles (direct)
```

- **Why a backend?** adsb.lol/adsbdb aren't guaranteed CORS-friendly and are rate
  limited. The proxy centralises **caching** (5 s per area), **enrichment**, and a
  **simulated fallback**, and keeps the browser talking to one origin. This is the
  first slice of the BRD's `apps/api` service.
- **Same map plumbing as Module 1.** Aircraft sources/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump, so basemap
  switches don't drop them. The plane icon is a canvas-drawn `ImageData` added via
  `map.addImage`, rotated with `icon-rotate: ['get','track']`.
- **Trails** are built from *observed* positions (`aircraftStore` keeps a capped
  history per aircraft) — no extra API needed.
- **Polling** only runs while the **Aircraft** layer is visible, and only refetches
  on **user-driven** map moves (programmatic follow/flyTo are ignored to avoid a
  feedback loop).

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/index.ts`, `apps/api/src/aircraft/*` |
| Data / state | `apps/web/src/data/aircraftStore.ts`, `store/aircraftSlice.ts`, `api/aircraftApi.ts` |
| Map | `apps/web/src/map/aircraft/*`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/AircraftPanel.tsx` |

---

## Notes / limitations

- **Coverage** is community ADS-B (excellent over land/Europe/US; sparser mid-ocean
  and over China). Where the feed is empty, the simulated fallback fills in so the
  module is always demonstrable.
- **Route/type** enrichment depends on adsbdb having the callsign/airframe; unknown
  fields show `—`.
- RainViewer public tiles are past-radar, ~last 2 h, refreshed every 5 min.
- Aircraft always reflect **live "now"** — they are independent of Module 1's
  historical timeline (which drives the demo activity feed).
