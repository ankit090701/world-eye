# Module 6 — Traffic Intelligence

Live road incidents + measured congestion/speed on the WorldEye map — free,
keyless, with a simulated fallback. Same architecture as Modules 2–4.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for the traffic feed.

> No API keys. Traffic incidents + road sensors: **Fintraffic Digitraffic Road**.

---

## Feature walkthrough & test checklist

- [ ] Open the **Traffic** panel (warning-triangle icon, left dock). Header shows
      **Live (Finland)** (green) or **Simulated** (amber) + incident/sensor counts.
- [ ] Click **Go to live coverage (Finland)** → the map flies to Finland and you see
      **incidents** (coloured dots: accident red, closure dark-red, roadwork amber,
      restriction blue, notice grey) + a **congestion heatmap** and **flow sensors**
      (green/amber/red by congestion).
- [ ] Click an **incident** → **Selected incident** card: type, severity, title,
      description, road, start time. Click a **flow sensor** → popup with congestion
      + volume (veh/h).
- [ ] Panel **Congestion** summary: average measured speed + a free/moderate/heavy
      split bar.
- [ ] **Incident type** filter chips (accident/closure/roadwork/restriction/notice)
      filter the map + list; "show all" resets.
- [ ] **Incidents** / **Flow / congestion** layer toggles (panel or Layers).
- [ ] Status bar shows a live **incident count** (alongside ✈ / ⛴ / 🚆 / 🚚).
- [ ] Outside Finland (e.g. Central Europe, US) shows a **Simulated** feed
      (incidents + congested corridors).
- [ ] Modules 1–5 still work: activity/timeline/tools + aircraft + ships + trains +
      fleet all run alongside traffic; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
TrafficEngine ─ GET /api/traffic?bbox ──▶ /traffic ┌─ traffic-message (incidents/roadworks/closures)
  (polls viewport bbox, 20s + on move)             ├─ TMS data + stations (speed/volume → congestion)
TrafficSync  ─ incidents + flow +                  └─ simulator (fallback)
              congestion heatmap ▶ map
TrafficPanel ─ congestion summary, filters, list
```

- **Two real feeds joined.** Incidents come from Digitraffic `traffic-message`
  (situationType → accident / roadwork / closure / restriction / notice). Congestion
  comes from **TMS** road sensors: the sensor `data` endpoint (average speed
  `KESKINOPEUS`, volume `OHITUKSET`) is joined by station `id` to the `stations`
  metadata (coordinates), then classified free/moderate/heavy by speed.
- **Same map plumbing as Modules 1–5** — traffic sources/layers (congestion heatmap +
  flow circles + incident circles) are added in `installOverlays()` beneath the
  tracking data and re-applied on every `styleEpoch` bump. No icon images (circles
  only). Polling runs while either traffic layer is visible and refetches on
  user-driven map moves.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/traffic/*`, `/api/traffic` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/trafficStore.ts`, `store/trafficSlice.ts`, `api/trafficApi.ts` |
| Map | `apps/web/src/map/traffic/TrafficLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| Config | `apps/web/src/config/trafficTypes.ts` |
| UI | `apps/web/src/components/panels/TrafficPanel.tsx` |

---

## Notes / limitations

- **Live coverage is Finland** (Digitraffic's remit) — real incidents + real
  measured speeds/volumes. The simulated fallback covers everywhere else.
- **Congestion** is derived from absolute sensor speed (TMS is mostly main roads);
  it's a heuristic, not a per-road free-flow comparison.
- "Cars (public traffic data)" is aggregate sensor **volume**, not individual
  vehicles — individual public-vehicle tracking would be surveillance.
- Traffic reflects **live now**, independent of Module 1's historical timeline.
