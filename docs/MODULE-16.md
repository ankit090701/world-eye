# Module 16 — Analytics

A live analytics dashboard over all the tracked data: distribution charts, a seismic
timeline, movement analysis, spatial cluster analysis, a session trend line, and
CSV/JSON export. **Keyless** — computed client-side with lightweight inline-SVG charts.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. Give the feeds a few seconds to populate, then open the
**Analytics** panel.

---

## Feature walkthrough & test checklist

- [ ] Open the **Analytics** panel (bar-chart icon, left dock).
- [ ] **Tracked objects** — a donut of aircraft / vessels / trains / fleet with a legend.
- [ ] **Charts** — aircraft **altitude** bands, earthquake **magnitude** bands, vessels
      **by category** (donut), threats **by country** (horizontal bars). Each renders when
      that data is present.
- [ ] **Seismic timeline** — earthquakes over the last 24 h in 2-hour buckets (real USGS
      timestamps).
- [ ] **Aircraft movement** — a speed histogram with the **average**, plus a heading
      distribution (8-point compass).
- [ ] **Cluster analysis** — switch between **quakes / aircraft / threats**; the top
      spatial clusters list with counts. Click one to **fly the map** to it.
- [ ] **Session trend** — a line chart that fills in over time (sampled every 20 s);
      switch the metric (total / aircraft / ships / threats / quakes).
- [ ] **Export** — download the whole snapshot as **CSV** or **JSON**.
- [ ] Modules 1–15 still work: Analytics only reads their data; nothing changes for them.

---

## Architecture

```
Browser (apps/web)
──────────────────
AnalyticsSampler (mounted in MapView) ── every 20s ▶ trendStore (session time-series)
AnalyticsPanel
   ├─ reads live stores (aircraft · ships · trains · fleet · weather · threats)
   ├─ lib/analytics.ts  → altitude/magnitude bands · ships-by-cat · threats-by-country ·
   │                       quake timeline · speed histogram · heading dist · grid clusters
   ├─ components/charts/Charts.tsx → BarChart · HBarChart · Donut · LineChart (inline SVG)
   └─ export → CSV / JSON (client-side Blob download)
```

- **Inline-SVG charts.** A tiny set of themed, dependency-free chart primitives
  (`components/charts/Charts.tsx`) — bar, horizontal-bar, donut and line — keeps the
  bundle lean and the look consistent with the rest of the app.
- **Pure analytics.** `lib/analytics.ts` holds pure functions that turn store data into
  chart datasets and clusters, memoised per render.
- **Trend sampler.** `AnalyticsSampler` records the current totals into `trendStore`
  every 20 s (cheap store reads) so the trend line has history the moment you open the
  panel.
- **Cluster analysis** grid-bins points into ~10° cells and centres each cell; clicking a
  cluster flies the map there.
- **Export** serialises the current snapshot (totals · distributions · clusters · trend)
  to CSV or JSON and downloads it via a Blob.

### Key files

| Area | Files |
|------|-------|
| Charts | `apps/web/src/components/charts/Charts.tsx` |
| Analytics | `apps/web/src/lib/analytics.ts` |
| Trend | `apps/web/src/data/analyticsSampler.ts`, `apps/web/src/map/analytics/AnalyticsSampler.tsx` |
| UI | `apps/web/src/components/panels/AnalyticsPanel.tsx` |

(No new API route — `/api/health` simply reports module 16 as present.)

---

## Notes / limitations

- **Live-data dependency.** Charts reflect what's currently loaded — aircraft/ships are
  viewport-scoped, and a chart reads empty until its source has fetched (weather &
  threats are on by default; ships need the map over a covered region).
- **Heatmaps.** The BRD's geographic heatmaps are rendered as **map layers** (activity,
  traffic congestion, weather). This panel provides the analytical distribution/intensity
  breakdowns; it doesn't duplicate the on-map heatmaps.
- **Trend history** starts empty and fills over the session (the line shows “collecting…”
  until it has a couple of samples); it isn't persisted across reloads.
- **Charts are inline SVG** (not Chart.js/ECharts) — deliberate, to avoid a dependency
  and keep the bundle small and on-theme.
