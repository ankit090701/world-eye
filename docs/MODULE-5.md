# Module 5 — Fleet Tracking

Live tracking + telematics for an organisation's **own authorized fleet**
(geofencing, fuel, maintenance, driver, trips, alerts).

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for the fleet feed.

> **Authorized devices only.** Fleet telematics is enterprise-owned data — there
> is no public feed, and tracking arbitrary vehicles would be surveillance. This
> module ships a **simulated fleet**; in production the same `/api/fleet` contract
> is fed by real telematics (Geotab / Samsara / Webfleet…) for owned/consented devices.

---

## Feature walkthrough & test checklist

- [ ] Open the **Fleet** panel (truck icon, left dock). It shows **overview counts**
      (Moving / Idle / Parked / Offline), an **alerts feed**, and a **vehicle list**.
- [ ] Click **Locate fleet** → the map flies to the fleet (based near London by
      default) and fits all vehicles. You see vehicles as **arrows coloured by
      status**, moving along delivery loops, plus **geofence zones** (depot cyan,
      customer green, restricted red, low-emission indigo).
- [ ] Click a vehicle (map or list) → **Selected vehicle** telematics: plate, driver,
      type, status, **engine status**, **speed**, **fuel gauge**, **odometer**,
      **next-service** distance, current **geofence/zone**, last update, and
      **trip history**.
- [ ] **Follow** keeps a moving vehicle centred; **Center** re-centres once.
- [ ] **Status filter** (the four count tiles) — click *Parked* to hide parked
      vehicles, etc.; "clear status filter" resets.
- [ ] **Alerts** feed lists speeding / low-fuel / idling / maintenance / restricted-
      zone / offline events, severity-ranked; click one to jump to that vehicle.
- [ ] **Geofences** toggle (panel or Layers) shows/hides the zones.
- [ ] **Operate here** relocates the demo fleet to the current map centre — handy to
      put the fleet wherever you're looking.
- [ ] Status bar shows a live **truck count** alongside ✈ / ⛴ / 🚆.
- [ ] Modules 1–4 still work: activity/timeline/tools + aircraft + ships + trains all
      track alongside the fleet; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
FleetEngine ── GET /api/fleet[?lat&lon] ─▶ /fleet → generateFleet(depot, now)
  (polls every 3s; NON-viewport)                     deterministic telematics sim:
FleetSync   ── vehicles + geofences +                - routes/interpolation (positions)
              trail + follow ▶ map                   - engine/fuel/odometer/maintenance
FleetPanel  ── overview, alerts, telematics          - geofence membership + alerts + trips
```

- **Non-viewport model.** A fleet is a *fixed owned set*, not something you discover
  by panning — so `/api/fleet` returns the whole fleet (+ geofences + alerts) and the
  engine polls on a simple 3 s interval (no bbox). Discovery is via the panel's
  **Locate fleet**.
- **Deterministic simulation.** `generateFleet(depot, now)` seeds each vehicle from
  the depot + index, builds a delivery-loop route, and computes position by
  interpolating along the route from elapsed time — so vehicles move smoothly and
  the whole scene is reproducible. Fuel/odometer/maintenance/alerts derive from that
  state; geofence membership is a point-in-circle test.
- **Same map plumbing as Modules 1–4** — fleet + geofence sources/layers and the
  vehicle icon are added in `installOverlays()` and re-applied on every `styleEpoch`
  bump. Geofences render beneath the data; vehicles render on top.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/fleet/*`, `/api/fleet` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/fleetStore.ts`, `store/fleetSlice.ts`, `api/fleetApi.ts` |
| Map | `apps/web/src/map/fleet/*`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| Config | `apps/web/src/config/fleetTypes.ts` |
| UI | `apps/web/src/components/panels/FleetPanel.tsx` |

---

## Notes / limitations

- The fleet is **simulated** (clearly labelled) — swap `generateFleet` for a real
  telematics provider behind the same `FleetResponse` contract to go live.
- Default operating area is Greater London; use **Operate here** to move it.
- Alerts/geofences are computed from live vehicle state each poll.
