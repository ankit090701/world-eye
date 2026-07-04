# Module 3 — Ship Tracking

Live vessels (AIS) on the WorldEye map, powered by a free keyless source with a
simulated global fallback — the same architecture as Module 2.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # starts web (:5173) and API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for live ships.

> No API keys. Ships/AIS: **Fintraffic Digitraffic Marine**.

---

## Feature walkthrough & test checklist

- [ ] Open the **Ships** panel (ship icon, left dock). Header shows **Live AIS**
      (green) or **Simulated** (amber) + vessel count + "updated Ns ago".
- [ ] **Zoom to the Baltic Sea / Gulf of Finland** (around Helsinki / Stockholm)
      → hundreds of **live** vessels, coloured by type (cargo blue, tanker amber,
      passenger green, fishing cyan, tug purple, military red…), each a boat icon
      **rotated to its heading**.
- [ ] **Click a ship** (or a *Nearby vessels* row) → **Selected vessel** card:
      name, category + AIS type, **destination + ETA**, **speed**, **course**,
      **nav status**, **draught**, **MMSI / IMO / call sign / flag**.
- [ ] The selected vessel grows a **trail** (its recent track / "port history").
- [ ] **Follow** keeps it centred; **Center** re-centres once.
- [ ] **Vessel type** filter chips — click *Tanker* to hide tankers, etc.;
      "show all" resets. The map + nearby list update live.
- [ ] Anywhere **outside** the Baltic (e.g. mid-Atlantic, US coast) shows a
      **Simulated** feed so ships always appear and move.
- [ ] Status bar (bottom) shows a live **⛴ ship count** (green when live).
- [ ] Switch basemaps — ships, trails and selection **persist** across the change.
- [ ] Modules 1 & 2 still work: activity/timeline/tools, and **aircraft** continue
      tracking alongside ships (both counts in the status bar).

### Verifying the fallback
Stop the API (`Ctrl-C` the `api` process) — the panel shows **Feed offline**,
then a **Simulated** feed keeps vessels moving. Restart `npm run dev:api`.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
ShipEngine ── GET /api/ships?bbox ──────▶ /ships ┌─ Digitraffic locations + vessels
  (polls viewport bbox, 15s + on move)           │    (merged by MMSI, cached, bbox-filtered)
ShipSync   ── renders GeoJSON ▶ map              └─ simulator (fallback)
ShipPanel  ── details / filters / nearby
```

- **Real AIS via Digitraffic** — the proxy fetches `/api/ais/v1/locations`
  (position/speed/heading, cached 12 s) and `/api/ais/v1/vessels`
  (name/type/destination/eta, cached 5 min), **joins them by MMSI**, classifies the
  AIS ship-type into a WorldEye category, decodes the AIS ETA field, and filters to
  the requested bounding box. Metadata is best-effort (`allSettled`) so a metadata
  hiccup never drops live positions.
- **Same map plumbing as Modules 1–2** — ship sources/layers + the boat icon are
  added in `installOverlays()` and re-applied on every `styleEpoch` bump. Polling
  only runs while the **Ships** layer is visible, and only refetches on
  **user-driven** map moves (follow/flyTo are ignored).
- **Trails** are built from observed positions (`shipStore` keeps a capped history
  per MMSI).

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/ships/*`, `/api/ships` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/shipStore.ts`, `store/shipSlice.ts`, `api/shipsApi.ts` |
| Map | `apps/web/src/map/ships/*`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| Config | `apps/web/src/config/shipTypes.ts` (colours, labels, nav status) |
| UI | `apps/web/src/components/panels/ShipPanel.tsx` |

---

## Notes / limitations

- **Live coverage** is the Baltic / Finnish waters (Digitraffic's remit). This is
  a busy, well-covered region — ideal for a live demo. Global keyless AIS with a
  permissive CORS/rate policy isn't currently available; the simulated fallback
  covers everywhere else. (A global source such as AISStream can be slotted into
  `apps/api/src/ships/` later behind a free key if desired.)
- **Port History / Container Routes** are represented by the live observed track +
  AIS destination; full historical port-call data needs a paid history API.
- **Military ships** appear only where they publicly broadcast AIS (type 35 / 55).
- Ships reflect **live "now"**, independent of Module 1's historical timeline.
