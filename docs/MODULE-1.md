# Module 1 — World Map Dashboard

The unified operational picture: an interactive 3D world map that every later
WorldEye tracking module renders onto.

---

## How to run

```bash
npm install      # from repo root (installs all workspaces)
npm run dev      # http://localhost:5173 (also starts the API on :8787)
```

Module 1 itself needs no API keys, accounts or backend — all its providers are free &
keyless.

With Docker, `docker compose up --build -d` serves the same app on **http://localhost:8080** (see the README).

---

## Feature walkthrough & test checklist

Use this to verify the module. Everything below should work with no setup.

### The map
- [ ] On load you see a Europe-centred **3D globe** on the light Positron basemap with
      a live **activity heatmap** and coloured **signal points**.
- [ ] Drag to rotate, scroll to zoom, right-drag (or ctrl-drag) to tilt/rotate.
- [ ] Bottom-right zoom/compass control on mouse and trackpad screens (touch screens
      pinch to zoom and rotate instead); bottom-left scale bar.

### Top bar
- [ ] **Live / Replay** chip shows the feed state; click it to jump back to live.
- [ ] The **search box** (or pressing `/`) opens the Search panel: type a place (e.g.
      `Tokyo`) → results → click to fly there; or type `48.8566, 2.3522` → "Go to
      coordinate" flies there and drops a marker.

### Left sidebar (panels)
- [ ] Panels are grouped (map · tracking · environment · intelligence · operations);
      hovering an icon shows its name, and the sidebar scrolls on short screens.
- [ ] **Layers** — pick any of 4 basemaps (Positron, Voyager, Liberty, Satellite);
      switch **3D Globe ⇄ Flat**; toggle each overlay and drag its **opacity** slider
      (Heatmap, Points, Drawings, Graticule grid).
- [ ] **Bookmarks** — "Bookmark current view", rename it, fly back to it, delete it.
      Reload the page — bookmarks persist (localStorage).
- [ ] **Overview** — legend by category, live counts, heatmap scale, attributions.

### Right toolbar (tools)
- [ ] **Measure** — click points across the map; a HUD shows geodesic **distance**
      (and **area** once you have 3+ points). Backspace undoes, Esc resets.
- [ ] **Draw** — open the fly-out and pick Point / Line / Polygon / Rectangle /
      Circle. Draw shapes; live length/area/radius readouts; Enter or ✓ finishes
      lines/polygons; shapes persist while you change basemaps.
- [ ] **Globe/Flat**, **Reset north**, **Zoom to world** quick actions.
- [ ] **Camera** — exports a **PNG** of the current map (with branding + timestamp).

### Timeline (bottom)
- [ ] Drag the **scrubber** back in time — the activity revealed on the map changes
      (this is **Historical Playback**). Mode flips to REPLAY.
- [ ] **Play** ▶ animates through the 24 h window; change **Speed** (60×–600×).
- [ ] Change the **Window** (30 m – 24 h) to widen/narrow how much is shown.
- [ ] Click **LIVE** to resume real-time; new signals appear every ~1.5 s.

### Status bar (very bottom)
- [ ] Live **cursor lat/lng + DMS**, map **center/zoom/bearing/pitch**, drawings
      count, visible-signal count, projection, and LIVE/REPLAY state.

### Phones & tablets
- [ ] On a phone (under 768 px wide) the whole globe opens in view with no panel
      open. The left rail is replaced by the **grid button** in the top bar, which
      lists every panel (Search included) as labelled tiles.
- [ ] Panels open as **bottom sheets** over the map: drag the handle or header down
      (or flick it) to close, or tap ✕. The map stays usable above the sheet.
- [ ] Tablets keep the rail and side panels. In portrait the globe opens
      unobstructed; the Layers panel only opens by default from 1024 px wide.
- [ ] On a landscape phone (under 500 px tall) the right toolbar runs as a row under
      the top bar.
- [ ] The scale bar and attribution never sit under the timeline, and the status bar
      keeps only the live counts on narrow screens.

---

## Architecture

```
main.tsx ── <Provider store> ── <App>
                                   └── <MapProvider>        (holds the MapLibre instance)
                                        ├── <MapView>       (creates the map + mounts syncers/tools)
                                        │     ├── Syncers   (headless: keep map ⇄ Redux/data in step)
                                        │     └── Tools     (Measure, Draw — render HUDs)
                                        ├── TopBar / LeftDock (+ phone PanelLauncher) / RightToolbar
                                        ├── PanelHost (Layers | Search | Bookmarks | Overview)
                                        ├── TimelineBar / StatusBar / Toast
```

### Key ideas

- **Imperative map, declarative state.** MapLibre is controlled through small
  *syncer* components (`src/map/Syncers.tsx`). Each one watches a slice of Redux
  (or an external store) and imperatively applies it to the map.
- **`styleEpoch` pattern.** Switching basemaps calls `map.setStyle()`, which wipes
  all custom layers. A single persistent `style.load` handler re-installs every
  WorldEye overlay and bumps `map.styleEpoch` in Redux; every syncer depends on
  that epoch, so overlays, data and visibility are re-applied automatically after
  any basemap change. See `installOverlays()` in `src/map/mapLayers.ts`.
- **External stores for high-churn data.** The activity feed
  (`src/data/activityStore.ts`) and drawings (`src/data/drawStore.ts`) live
  outside Redux and expose `useSyncExternalStore` hooks, so live updates don't
  thrash global state.
- **No heavyweight geo deps.** Distance (haversine), spherical polygon area,
  graticule, rectangle/circle rings, DMS formatting and coordinate parsing are all
  in `src/lib/geo.ts` — keeps `npm install` small and reliable.

### State (Redux Toolkit slices — `src/store/`)

| slice | owns |
|-------|------|
| `ui` | active panel, active tool, phone panel-launcher state, toasts |
| `map` | basemap, projection, `styleEpoch`, camera view, cursor |
| `layers` | overlay visibility + opacity |
| `bookmarks` | saved views (persisted to localStorage) |
| `timeline` | mode (live/historical), window, playhead, playback speed |

---

## Swapping the demo feed for real data

The activity layer reads GeoJSON from the `we-activity` source. Modules 2–18 render
their live data on their own layers, so this feed remains demo data. To drive it from
a real source:

1. Replace `src/data/activitySimulator.ts` / `activityStore.ts` with a real source
   (REST poll or WebSocket) that emits `ActivitySignal`-shaped records.
2. Everything else — heatmap, points, timeline windowing, playback, legend, stats —
   keeps working unchanged.

This is why Module 1 is built as a generic, reusable operational-picture layer
rather than being hard-wired to any one data type.

---

## Notes / known limitations

- The activity feed (heatmap, signal points, timeline) is **simulated demo data**,
  labelled as such in the Overview panel; the tracking modules' live data renders on
  its own layers.
- Place search uses public Nominatim; heavy use should respect its usage policy —
  fine for interactive use.
- The main JS bundle is ~1.5 MB minified (~420 KB gzipped), mostly MapLibre; the
  PDF/Excel export libraries are code-split and load only on demand.
