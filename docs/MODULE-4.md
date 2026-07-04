# Module 4 — Train Tracking

Live trains (positions, schedules, delays, routes) on the WorldEye map — free,
keyless, with a simulated fallback. Same architecture as Modules 2 & 3.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for live trains.

> No API keys. Rail data: **Fintraffic Digitraffic Rail**.

---

## Feature walkthrough & test checklist

- [ ] Open the **Trains** panel (train icon, left dock). Header shows
      **Live (Finland)** (green) or **Simulated** (amber) + count + "updated Ns ago".
- [ ] **Zoom to Finland** (Helsinki / Tampere / Oulu) → live trains, coloured by
      type (Long-distance green, Commuter blue, **Cargo amber**, Other purple),
      icons rotated to their direction of travel. Delayed trains get a **red halo**.
- [ ] **Click a train** (or a *Nearby trains* row) → **Selected train** card:
      line/type badge, number, operator, **origin → destination**, **speed**,
      **delay** (colour-coded), **next stop**.
- [ ] The map draws the train's **route** (dashed line through its stops) and its
      **observed trail**; the panel shows a live **schedule table** (each stop with
      scheduled time + delay; passed stops dimmed, next stop highlighted).
- [ ] **Follow** keeps it centred; **Center** re-centres once.
- [ ] **Train type** filter chips — click *Cargo* to hide cargo trains, etc.;
      "show all" resets. Map + nearby list update live.
- [ ] Outside Finland (e.g. Central Europe, US) shows a **Simulated** feed.
- [ ] Status bar (bottom) shows a live **train count** (green when live), alongside
      the aircraft ✈ and ship ⛴ counts.
- [ ] Modules 1–3 still work: activity/timeline/tools + aircraft + ships all track
      alongside trains; switching basemaps preserves everything.

### Verifying the fallback
Stop the API (`Ctrl-C` the `api` process) — the panel shows **Feed offline**,
then a **Simulated** feed keeps trains moving. Restart `npm run dev:api`.

---

## Architecture

```
Browser (apps/web)                          apps/api (Express, :8787)
──────────────────                          ─────────────────────────
TrainEngine ── GET /api/trains?bbox ───────▶ /trains ┌─ train-locations/latest (positions, cached 10s)
  (polls viewport bbox, 12s + on move)               ├─ per-train /trains/{date}/{n} (category, route;
TrainSync   ── renders GeoJSON ▶ map                  │    concurrency-limited, cached 5min)
  (points + trail + route line/stops + follow)        └─ metadata/stations (names/coords, cached 24h)
TrainPanel  ── GET /api/trains/route/:date/:n ─────▶ /route  (ordered stops + schedule)
```

- **Live positions in bulk + per-train enrichment.** `/train-locations/latest`
  gives all train GPS positions; each located train in the viewport (capped at 60,
  nearest-first) is enriched via its own `/trains/{date}/{number}` call
  (concurrency-limited to 10, cached 5 min) for category, type, operator, origin/
  destination and current delay. This is the same "positions bulk + per-item
  enrichment" pattern as aircraft.
- **Route drawing.** Selecting a train fetches its full timetable, joins each stop
  to station coordinates, and draws the route line + commercial-stop markers; the
  panel renders the schedule table with per-stop delays.
- **Heading** is derived from consecutive observed positions (trains' AIS-style feed
  has no heading field).
- **Same map plumbing as Modules 1–3** — train sources/layers + the railcar icon
  are added in `installOverlays()` and re-applied on every `styleEpoch` bump.
  Polling runs only while the **Trains** layer is visible and only refetches on
  user-driven map moves.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/trains/*`, `/api/trains*` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/trainStore.ts`, `store/trainSlice.ts`, `api/trainsApi.ts` |
| Map | `apps/web/src/map/trains/*`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| Config | `apps/web/src/config/trainTypes.ts` |
| UI | `apps/web/src/components/panels/TrainPanel.tsx` |

---

## Notes / limitations

- **Live coverage is Finland** (Digitraffic's remit) — dense, reliable rail data
  incl. real **cargo** trains. The simulated fallback covers everywhere else.
- Only GPS-equipped trains report live position (most passenger + many cargo).
- Route/schedule reflect the train's timetable; delays are live per stop.
- Trains reflect **live "now"**, independent of Module 1's historical timeline.
