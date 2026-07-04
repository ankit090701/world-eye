# Module 9 — Weather Intelligence

Global weather + natural-hazard picture: precipitation radar, a temperature / wind /
lightning field, tropical cyclones, wildfires and earthquakes — with a point
current-conditions read-out. All sources free & keyless.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for the weather feeds.

> No API keys. Sources: Open-Meteo · RainViewer · NOAA NHC · NASA EONET · USGS.

---

## Feature walkthrough & test checklist

- [ ] Open the **Weather** panel (sun/cloud icon, left dock).
- [ ] **Current conditions** — click **Weather at map centre** (or a city chip like
      *Tokyo*). A card shows temperature, feels-like, weather text, wind, gusts,
      humidity, cloud, precipitation and CAPE; a marker drops at the point.
- [ ] **Layer toggles** — flip each on/off and see it on the map:
  - [ ] **Precipitation radar** — RainViewer raster (rain/snow).
  - [ ] **Temperature field** — colour-ramped global points; click one for details.
  - [ ] **Wind** — arrows pointing downwind, larger = faster.
  - [ ] **Lightning / convective** — yellow cells where CAPE is high.
  - [ ] **Storms & cyclones** — category-coloured markers (click for name/winds).
  - [ ] **Wildfires** — orange fire markers (click for size/EONET).
  - [ ] **Earthquakes** — sized by magnitude, coloured by depth (click for M/place/depth).
- [ ] **Active events** — the lists (cyclones / strongest earthquakes / wildfires)
      populate; clicking a row flies the map to it.
- [ ] Cyclones show **live · NOAA NHC** or **sample** (when no storms are active).
- [ ] Switch basemap (sun/moon or Layers) — every weather layer persists.
- [ ] Modules 1–8 still work: all tracking/traffic/cyber/domain layers run alongside
      the weather layers; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                        apps/api (Express, :8787)
──────────────────                        ─────────────────────────
WeatherPanel ── GET /api/weather/current ▶ /current → Open-Meteo (point)
  (current conditions)
WeatherGridEngine ─ GET /api/weather/grid ▶ /grid   → Open-Meteo (BATCHED grid) │ simGrid
WeatherEventsEngine ─ GET /api/weather/events ▶ /events → NHC cyclones │ simCyclones
  (poll only while a layer is on)                        + EONET wildfires + USGS quakes
WeatherGridSync / WeatherEventsSync ▶ map
WeatherInteractions ▶ click popups
RainViewer radar ▶ WeatherOverlaySync (from Module 2, reused)
```

- **Batched grid.** The temperature / wind / cloud / lightning field is a single
  Open-Meteo request with ~105 comma-separated coordinates — one call for the whole
  globe. `lightning` is derived from CAPE (> 800 J/kg ≈ thunderstorm potential).
- **Events.** Cyclones (NHC), wildfires (EONET) and earthquakes (USGS) are fetched
  together in `/events`. Each source catches its own errors; cyclones fall back to a
  deterministic simulated set when none are active so the layer is always demonstrable.
- **Polling discipline.** Each engine polls **only while its layer(s) are visible**
  (grid every 10 min, events every 3 min) and the server caches every feed, so a few
  clients don't hammer the upstreams.
- **Same map plumbing as Modules 1–8** — the weather sources/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump; the wind-arrow icon
  is re-added on each `style.load`. The RainViewer radar reuses the Module 2 overlay.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/weather/*`, `/api/weather/*` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/weatherStore.ts`, `store/weatherSlice.ts`, `api/weatherApi.ts` |
| Map | `apps/web/src/map/weather/WeatherLayer.tsx`, `windArrowIcon.ts`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/WeatherPanel.tsx` |

---

## Notes / limitations

- **Cyclone coverage** — NOAA NHC covers the Atlantic and E/Central Pacific basins.
  When there are no active storms (or off-season) WorldEye shows a small **simulated**
  set, clearly labelled *sim*, so the layer is always demonstrable.
- **Lightning** is inferred from **CAPE** (convective available potential energy), not
  a real-time strike feed — it highlights thunderstorm-*risk* cells, not exact strikes.
- **Temperature/wind field** is a coarse global grid (~105 points) for a fast, single
  request; it is an overview field, not a high-resolution model.
- **Radar** (RainViewer) shows roughly the last 2 hours of precipitation and is best
  over land with good radar coverage.
- Earthquakes are the **USGS all-day** feed (last 24 h), strongest first, capped for a
  lean payload.
