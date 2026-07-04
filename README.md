# WorldEye

> Next-generation global intelligence platform — visualize, monitor and analyze
> worldwide movement and digital intelligence on a unified interactive world map.

This repository is being built **module by module** from the WorldEye BRD
([`worldeye-brd.md`](worldeye-brd.md)). Each module is developed, tested and
signed off before the next one begins.

| # | Module | Status |
|---|--------|--------|
| **1** | **World Map Dashboard** | ✅ Built |
| **2** | **Aircraft Tracking** | ✅ Built |
| **3** | **Ship Tracking** | ✅ Built |
| **4** | **Train Tracking** | ✅ Built |
| **5** | **Fleet Tracking** | ✅ Built |
| **6** | **Traffic Intelligence** | ✅ **Built — ready for review** |
| 7 | Cyber Intelligence | ⏳ pending |
| … | (through Module 18) | ⏳ pending |

---

## Quick start

Requires **Node.js ≥ 20** (tested on Node 22).

```bash
# from the repository root
npm install
npm run dev
```

Then open **http://localhost:5173**.

`npm run dev` starts **both** the web app (`:5173`) and the WorldEye API
(`:8787`, needed by Module 2 for live aircraft). To run just Module 1's frontend:

```bash
npm run dev:web     # web only (Module 1)
npm run dev:api     # API only
```

Other commands:

```bash
npm run build       # production build (apps/web/dist)
npm run preview     # serve the production build on :4173
npm run typecheck   # TypeScript check across web + api
```

> **No API keys required.** Every data/map provider is free and keyless (see
> "Free & open data sources" per module), so it runs out of the box.
> Open the app in a normal browser (not a network-restricted in-IDE preview) so
> the external map/data providers can load.

---

## Module 1 — World Map Dashboard

The operational-picture foundation that every later tracking module renders onto.
All BRD Module 1 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Interactive 3D Map** | MapLibre GL JS **globe projection** (real 3D globe), pan/zoom/tilt/rotate |
| **Dark Mode** | Signature dark console + dark basemap; sun/moon toggle swaps dark ⇄ light basemap |
| **Heatmaps** | Native MapLibre heatmap layer over the activity feed, opacity-controlled |
| **Timeline** | 24-hour scrubber with playhead, adjustable reveal window (30 m – 24 h) |
| **Layer Controls** | Toggle + opacity for every overlay; 5 basemaps; globe/flat projection |
| **Real-time Updates** | Live feed injects fresh signals every ~1.5 s; pulsing **LIVE** indicator |
| **Historical Playback** | Play/pause, speed 60×–600×, loops through the 24 h window |
| **Measurement Tool** | Click a path → geodesic distance + polygon area, live readout |
| **Coordinate Search** | Type `lat, lng` to fly there; DMS readout; "use map centre" helper |
| **Bookmarks** | Save/rename/delete camera views; persisted to `localStorage` |
| **Drawing Tools** | Point, line, polygon, rectangle, circle — with live measurements |
| **Export Images** | One-click PNG of the map with WorldEye branding + timestamp |

Plus: live cursor lat/lng + DMS, center/zoom/bearing/pitch read-out, place search
(OpenStreetMap Nominatim), category legend and live statistics.

### About the activity data

Module 1 ships with a **self-contained simulated activity feed** (`src/data/`)
so heatmaps, the timeline, playback and live updates are all demonstrable today.
It is clearly labelled as demo data in the UI. When Modules 2+ come online
(aircraft, ships, trains, weather…), their real feeds replace the simulator —
**the map, layers, timeline and tools stay exactly the same.**

### Free & open data sources (no keys)

- **Basemaps** — CARTO GL styles (Dark Matter / Positron / Voyager), OpenFreeMap
  Liberty, all free & keyless; Esri World Imagery for satellite.
- **Map engine** — [MapLibre GL JS](https://maplibre.org/) (open source).
- **Place search** — OpenStreetMap [Nominatim](https://nominatim.org/).
- Basemap data © OpenStreetMap contributors.

---

## Project structure

```
worldeye/
├── apps/
│   ├── web/                 # React + TypeScript + Vite frontend
│   │   └── src/
│   │       ├── map/         # MapLibre integration, syncers, tools, aircraft/
│   │       ├── components/  # UI shell + panels
│   │       ├── store/       # Redux Toolkit slices
│   │       ├── data/        # activity simulator + external stores
│   │       ├── api/         # WorldEye API client (Module 2+)
│   │       ├── config/      # basemaps, layers, api base
│   │       └── lib/         # geodesy, export, helpers
│   └── api/                 # Express data proxy & enrichment (Module 2+)
│       └── src/aircraft/    # adsb.lol + adsbdb + simulated fallback
├── docs/                    # module documentation
└── worldeye-brd.md          # source requirements
```

The repo is an **npm-workspaces monorepo** so upcoming modules (`apps/api`,
`apps/worker`, `apps/gateway`, `packages/*` per the BRD) slot in without
restructuring.

See [`docs/MODULE-1.md`](docs/MODULE-1.md) for the full feature walkthrough and
architecture notes.

---

## Module 2 — Aircraft Tracking

Live flights rendered on the Module 1 map, with a dedicated **Aircraft** panel
(plane icon in the left dock). All BRD Module 2 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Live Flights** | Real ADS-B from **adsb.lol** (free, no key), polled per viewport |
| **Flight Path** | Observed trail of the selected aircraft, drawn as you watch |
| **Altitude / Speed / Heading** | Live values + altitude colour ramp + heading-rotated plane icons |
| **Aircraft Type / Registration** | From the ADS-B feed (`t` / `r` fields) |
| **Airline / Airport** | Route enrichment via **adsbdb** (origin → destination + operator) |
| **Flight History** | Rolling observed track per aircraft (trail) |
| **Weather Overlay** | **RainViewer** precipitation radar toggle (free, no key) |
| **Emergency Squawk** | 7500/7600/7700 detection → red highlight, alert list, filter |
| **Nearby Flights** | Ranked list of the closest aircraft to the map centre |

Click any plane (or a list row) to select it: the panel shows full details,
the route, a **Follow** mode, and its live trail.

### Architecture

A thin **`apps/api`** Express service proxies and enriches the free upstreams
(server-to-server, so no browser CORS/rate-limit issues) and **falls back to a
simulated feed** if an upstream is unavailable — so planes always appear. The
frontend polls `GET /api/aircraft?lat=&lon=&radius=` for the current viewport
and renders them through the same `styleEpoch`/syncer pattern as Module 1.

### Free & open data sources (no keys)

- **Aircraft** — [adsb.lol](https://api.adsb.lol/docs) (ADS-B Exchange v2 schema).
- **Route / airline / airports** — [adsbdb.com](https://www.adsbdb.com/).
- **Weather radar** — [RainViewer](https://www.rainviewer.com/api.html).

See [`docs/MODULE-2.md`](docs/MODULE-2.md) for the test checklist & details.

---

## Module 3 — Ship Tracking

Live vessels on the map with a dedicated **Ships** panel (ship icon in the left
dock). All BRD Module 3 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **AIS Data** | Real AIS from **Fintraffic Digitraffic** (free, no key) |
| **Cargo / Oil Tankers / Fishing / Military** | AIS ship-type → categorised & colour-coded; filter chips per type |
| **Speed / Heading** | Live SOG + heading (heading-rotated boat icons) |
| **Destination / ETA** | From AIS voyage data (ETA decoded from the AIS field) |
| **Port History** | Live observed track (trail) of the selected vessel |
| **Container Routes** | Selected-vessel trail + destination; type filter to isolate cargo |

Each vessel shows name, MMSI/IMO, call sign, flag, category, nav status,
draught, speed, course, destination and ETA. Click a ship (or a *Nearby vessels*
row) to select, **Follow**, and watch its trail build.

### Coverage & fallback

Digitraffic provides real AIS for the **Baltic / Finnish waters** (busy shipping
region — great live demo). Outside that coverage the same `apps/api` proxy serves
a **simulated** vessel feed, so ships always appear. The panel header shows
**Live AIS** (green) or **Simulated** (amber).

### Free & open data sources (no keys)

- **Ships / AIS** — [Fintraffic Digitraffic Marine](https://www.digitraffic.fi/en/marine-traffic/).

See [`docs/MODULE-3.md`](docs/MODULE-3.md) for the test checklist & details.

---

## Module 4 — Train Tracking

Live trains on the map with a dedicated **Trains** panel (train icon in the left
dock). All BRD Module 4 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Live Position** | Real train GPS from **Fintraffic Digitraffic Rail** (free, no key) |
| **Speed** | Live speed (km/h); heading derived from movement (rotated icon) |
| **Train Routes** | Selected train's route drawn from its timetable + station coords |
| **Station Info** | Station names/coordinates from rail metadata |
| **Schedules** | Per-stop scheduled times in the panel |
| **Delays** | Live `differenceInMinutes` per stop + overall; colour-coded |
| **Cargo Trains / Passenger Trains** | AIS-style category (Long-distance / Commuter / Cargo) — coloured + filterable |

Click a train (or a *Nearby trains* row) to select: the panel shows number,
type/line, operator, origin→destination, speed, delay, next stop, and a live
**schedule table**; the map draws its **route** (stops) and observed trail.

### Coverage & fallback

Digitraffic covers **Finland's railway** (real live data). Outside Finland the
same `apps/api` proxy serves a **simulated** train feed. The panel header shows
**Live (Finland)** (green) or **Simulated** (amber).

### Free & open data sources (no keys)

- **Trains / rail** — [Fintraffic Digitraffic Rail](https://www.digitraffic.fi/en/railway-traffic/) (positions, schedules, delays, stations).

See [`docs/MODULE-4.md`](docs/MODULE-4.md) for the test checklist & details.

---

## Module 5 — Fleet Tracking

Your organisation's **own authorized fleet** (the BRD scopes this to authorized
/ consent-based devices — not public surveillance), with a dedicated **Fleet**
panel. All BRD Module 5 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **GPS Tracking (authorized devices)** | Live vehicle positions from a simulated telematics feed |
| **Engine Status** | On / Idle / Off per vehicle |
| **Fuel** | Live fuel % with a gauge; low-fuel alerts |
| **Driver** | Assigned driver per vehicle |
| **Maintenance** | Odometer + next-service distance; "service due" alerts |
| **Trip History** | Recent trips (from → to, distance, duration) per vehicle |
| **Geofencing** | Depot / customer / restricted / low-emission zones drawn on the map; breach alerts |
| **Alerts** | Speeding, geofence, low-fuel, idling, maintenance, offline — severity-ranked |

Vehicles are colour-coded by status (moving / idle / parked / offline). Click one
for full telematics; the panel has fleet overview counts, a status filter, an
alerts feed, **Locate fleet**, and **Operate here** (relocate the demo fleet to
wherever you're looking).

### Why simulated (and honest about it)

Unlike aircraft/ships/trains, fleet telematics is **enterprise-owned data from
authorized devices** — there is no public feed to consume, and tracking arbitrary
vehicles would be surveillance. So Module 5 ships a realistic **simulated fleet**
(Geotab/Samsara-style) via `apps/api`. In production the same `/api/fleet`
contract is fed by real telematics (Geotab, Samsara, Webfleet…) for devices the
organisation owns or has consent to track — the map, panel and alerts stay the same.

See [`docs/MODULE-5.md`](docs/MODULE-5.md) for the test checklist & details.

---

## Module 6 — Traffic Intelligence

Live road incidents and measured congestion, with a dedicated **Traffic** panel.
All BRD Module 6 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Incidents** | Real traffic messages (accidents/notices) from Digitraffic — clickable |
| **Construction** | Roadworks from the same feed, categorised & amber-coded |
| **Road Closures** | Closures detected & flagged high-severity |
| **Congestion** | Derived from measured sensor speeds (free / moderate / heavy) |
| **Speed Analysis** | Real average speeds from TMS road sensors |
| **Cars (public traffic data)** | Sensor traffic **volume** (vehicles/h) — sizes the flow points |
| **Heatmaps** | Congestion heatmap weighted by measured slowdown |

Incidents are colour-coded by type (accident/closure/roadwork/restriction/notice)
and sized by severity; flow sensors are colour-coded by congestion. The panel has
a congestion summary (avg speed + free/moderate/heavy split), incident type
filters, an incident list/details, and **Go to live coverage**.

### Coverage & fallback

Live data covers **Finland's road network** (Fintraffic Digitraffic — incidents +
TMS sensors). Outside Finland the same `apps/api` proxy serves a **simulated**
traffic feed (incidents + congested corridors). Header shows **Live (Finland)** or
**Simulated**.

### Free & open data sources (no keys)

- **Traffic incidents / roadworks / closures** — [Digitraffic traffic-message](https://www.digitraffic.fi/en/road-traffic/).
- **Congestion / speed / volume** — Digitraffic **TMS** road sensors.

See [`docs/MODULE-6.md`](docs/MODULE-6.md) for the test checklist & details.

---

## Tech stack

**Frontend:** React 18 · TypeScript · Vite · Redux Toolkit · MapLibre GL JS 5 ·
Tailwind CSS · lucide-react.
**Backend (`apps/api`):** Node · Express · TypeScript (run with `tsx`).

Further BRD services (WebSocket gateway, workers, the databases) arrive with the
modules that need them.
