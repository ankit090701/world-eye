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
| **6** | **Traffic Intelligence** | ✅ Built |
| **7** | **Cyber Intelligence** | ✅ Built |
| **8** | **Domain Intelligence** | ✅ Built |
| **9** | **Weather Intelligence** | ✅ Built |
| **10** | **Satellite Intelligence** | ✅ Built |
| **11** | **News Intelligence** | ✅ Built |
| **12** | **Social Intelligence** | ✅ **Built — ready for review** |
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

## Module 7 — Cyber Intelligence

An OSINT lookup tool (IP / domain / ASN → full report) **plus** a live threat-map
overlay of malicious infrastructure. Dedicated **Cyber** panel (shield icon).
All BRD Module 7 capabilities are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **IP Lookup** | Geolocation, ISP, org, mobile/proxy/hosting flags (ip-api) |
| **WHOIS** | Network allocation via **RDAP** (rdap.org) — handle, CIDR, range, entities |
| **ASN** | AS number + name + country (from geo + RDAP autnum) |
| **DNS** | A / AAAA / MX / NS / TXT + reverse DNS (Google DoH) |
| **SSL** | Certificates from **crt.sh** (issuer, CN, validity) |
| **Threat Feeds / Blacklists / Malware** | **abuse.ch Feodo** (botnet C2), **Tor** exit list, proxy/hosting flags |
| **Country / ISP / Hosting / Cloud Provider** | From geolocation + ASN, with cloud-provider detection |
| **Open Ports (authorized targets)** | **Intentionally gated** — no active scanning of arbitrary targets |

Enter an IP, domain or ASN → a full report with a threat verdict; resolved hosts
are located on the map. The **Cyber Threats** overlay plots geolocated botnet C2
servers (live from abuse.ch) as red markers.

### Responsible-use note

**No active port scanning** is performed. Scanning arbitrary user-supplied targets
would be unauthorized; the "Open Ports" capability is gated behind a documented
authorized-scan integration (Shodan/Censys) that is not enabled. All lookups hit
**fixed, public OSINT services** (no connection is made to the target host itself).

### Free & open data sources (no keys)

- **Geo/ISP/ASN** — [ip-api.com](https://ip-api.com/) · **WHOIS** — [RDAP](https://rdap.org/)
- **DNS** — Google DoH · **Certs** — [crt.sh](https://crt.sh/)
- **Threat intel** — [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch/), Tor exit list

See [`docs/MODULE-7.md`](docs/MODULE-7.md) for the test checklist & details.

---

## Module 8 — Domain Intelligence

A deep **domain OSINT** console (registration, DNS, email security, certificates,
subdomains, history) **plus** a map overlay of the domain's geolocated **hosting
footprint**. Dedicated **Domain** panel (globe icon). All BRD Module 8 features
are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **WHOIS** | Domain registration via **RDAP** (rdap.org) — registrar, dates, statuses, DNSSEC |
| **DNS Records** | A / AAAA / NS / CNAME / SOA / CAA via **Google DoH** |
| **MX** | Mail exchangers + auto-detected mail provider (Google, M365, Proton…) |
| **TXT** | All TXT records surfaced |
| **SPF** | Parsed from TXT with policy (hardfail / softfail / neutral) |
| **DMARC** | `_dmarc` TXT → policy (none / quarantine / reject), pct, rua |
| **Registrar** | From RDAP registrar entity (+ URL) |
| **Hosting** | Apex IP → country / ISP / org / ASN / **cloud provider** (ip-api) |
| **Historical DNS** | Certificate-transparency timeline — when each (sub)domain first appeared |
| **Certificates** | Issuer / CN / validity from **certspotter** (crt.sh fallback) |
| **Subdomains** | Passive enumeration from CT logs (certspotter / crt.sh) |

Enter a domain → a full report; the **Domain Infrastructure** overlay plots the
apex, `www`, mail, name-server and subdomain hosts as geolocated nodes linked in a
star topology (colour-coded by role), and the map flies to fit the footprint.
Also adds **DKIM** selector probing on top of the BRD list.

### Design & responsible use

Two parts: an on-demand **report** (panel) + a live **infrastructure map**. Every
lookup is **passive OSINT** — it reads public registries (RDAP), public DNS
(Google DoH) and **certificate-transparency logs**; WorldEye never connects to the
target host or actively scans it. The `q` is validated as a domain, normalised,
and passed only as an encoded parameter to **fixed** services (no SSRF). The route
caps query length, is per-IP rate-limited, and caches results 10 min.

> Very large CDN domains (e.g. `cloudflare.com`) have millions of CT entries and
> may exceed the CT provider's timeout — WHOIS / DNS / email / hosting / footprint
> still render; only the cert/subdomain sections come back empty.

### Free & open data sources (no keys)

- **WHOIS** — [RDAP](https://rdap.org/) · **DNS** — Google DoH
- **Certificates / subdomains / history** — [certspotter](https://sslmate.com/ct_search_api/) (keyless), [crt.sh](https://crt.sh/) fallback
- **Hosting geo/ASN** — [ip-api.com](https://ip-api.com/)

See [`docs/MODULE-8.md`](docs/MODULE-8.md) for the test checklist & details.

---

## Module 9 — Weather Intelligence

Global weather and natural-hazard picture on the map, with a dedicated **Weather**
panel (sun/cloud icon). All BRD Module 9 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Radar** | **RainViewer** precipitation radar raster (last 2h) |
| **Rain / Snow** | Same radar (precipitation type), toggleable |
| **Temperature** | Global current-temperature field, colour-ramped (Open-Meteo) |
| **Wind** | Wind arrows — point downwind, sized by speed (Open-Meteo) |
| **Clouds** | Cloud cover in the point read-out + grid popups |
| **Lightning** | Convective / thunderstorm-risk cells from CAPE (Open-Meteo) |
| **Storms / Cyclones** | Active tropical cyclones — category-coloured (**NOAA NHC**) |
| **Wildfires** | Active wildfires worldwide (**NASA EONET**) |
| **Earthquakes** | Quakes in the last 24 h, sized by magnitude, coloured by depth (**USGS**) |

The panel gives **current conditions** anywhere (map centre or a city chip → temp,
feels-like, wind, gusts, humidity, cloud, precipitation, CAPE), one-tap **layer
toggles**, and **live event lists** (cyclones, strongest earthquakes, wildfires)
that fly you to each. Click any storm / fire / quake / temperature node for details.

### Live data + graceful fallback

Temperature/wind/lightning come from one **batched** Open-Meteo call (a whole grid
in a single request — free, keyless). Cyclones use NOAA NHC; when no storms are
active (common off-season) a small **simulated** set keeps the layer demonstrable
(labelled *sim* in the panel and popups). Wildfires (EONET) and earthquakes (USGS)
are always live. Each feed caches server-side and polls only while its layer is on.

### Free & open data sources (no keys)

- **Conditions / temp / wind / cloud / CAPE** — [Open-Meteo](https://open-meteo.com/)
- **Radar** — [RainViewer](https://www.rainviewer.com/api.html) · **Cyclones** — [NOAA NHC](https://www.nhc.noaa.gov/)
- **Wildfires** — [NASA EONET](https://eonet.gsfc.nasa.gov/) · **Earthquakes** — [USGS](https://earthquake.usgs.gov/)

See [`docs/MODULE-9.md`](docs/MODULE-9.md) for the test checklist & details.

---

## Module 10 — Satellite Intelligence

Live orbital tracking on the map — satellites, the ISS, Starlink, debris and recent
launches, propagated in real time, with a dedicated **Satellites** panel. All BRD
Module 10 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Satellites** | Notable/brightest active satellites, live-propagated (CelesTrak) |
| **ISS** | Crewed stations (ISS, Tiangong) highlighted; live position + orbit |
| **Starlink** | Starlink constellation (evenly sampled for smooth rendering) |
| **Space Debris** | Tracked orbital debris (Cosmos-2251 breakup, sampled) |
| **Launches** | Objects launched in the **last 30 days** |
| **Orbits** | Ground track of the selected satellite (one full period, live) |

Every dot moves in real time. Click any object (or a list row) to select it — the
panel shows **altitude, speed, orbital period, inclination and live lat/lon**, and
its **ground track** is drawn on the map. Toggle each group; search by name or NORAD
id; the ISS and notable satellites load automatically.

### How it works — client-side propagation

The heavy lifting is orbital mechanics, done **in your browser**: the API proxies and
caches **two-line element sets (TLEs)** from CelesTrak, and the frontend propagates
them every second with **satellite.js** (SGP4) to compute real positions. This scales
to ~1,000 tracked objects at 1 Hz with no server load and no keys. Each group is
fetched only when its layer is enabled.

> CelesTrak throttles re-downloads (its data updates every 2 h and it returns 403 if
> you refetch sooner). WorldEye caches each group and serves the last-known-good set,
> so tracking keeps working; the ISS falls back to a bundled element set if CelesTrak
> is unreachable.

### Free & open data sources (no keys)

- **Orbital elements (TLEs)** — [CelesTrak](https://celestrak.org/) (stations, visual, starlink, debris, last-30-days)
- **Propagation** — [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4, runs in-browser)

See [`docs/MODULE-10.md`](docs/MODULE-10.md) for the test checklist & details.

---

## Module 11 — News Intelligence

Global news, categorised **and mapped**, with a dedicated **News** panel (newspaper
icon). All BRD Module 11 features are implemented:

| BRD feature | How it works |
|-------------|--------------|
| **Breaking News** | Google News top stories, live |
| **Natural Disasters** | Curated query (earthquake / flood / wildfire / hurricane…) |
| **Wars** | Conflict / military / ceasefire query |
| **Economic Events** | Economy / inflation / markets / trade query |
| **Political Events** | Elections / government / diplomacy / sanctions query |
| **Trending Topics** | Most-mentioned proper nouns across current headlines |

Pick a category tab → a live headline feed (each opens the source article). The
**News Hotspots** overlay plots where news is happening — headlines are **geoparsed**
against a built-in gazetteer and placed on the map, colour-coded by category and
sized by story count; click a hotspot for the place + top headline.

### How it works

The API pulls **Google News RSS** (free, keyless, reliable) per category, parses it,
and **geoparses each headline** against a built-in gazetteer of ~140 countries and
major cities to assign coordinates — giving news a real map presence without any
paid geocoding. Trending topics are derived from the frequency of proper nouns across
current headlines. Every feed is cached server-side; a small sample set is served if
the upstream is ever unreachable.

> Location is inferred from headline text, so it's approximate (a headline may mention
> no mapped place, or an ambiguous one). It's an at-a-glance "where news is happening"
> view, not authoritative geocoding.

### Free & open data sources (no keys)

- **News** — [Google News RSS](https://news.google.com/) (top stories + category search)
- **Geolocation** — built-in gazetteer (headline geoparsing)

See [`docs/MODULE-11.md`](docs/MODULE-11.md) for the test checklist & details.

---

## Module 12 — Social Intelligence

Trends and public posts from across the social web, in a dedicated **Social** panel
(share icon). All BRD Module 12 sources are covered:

| BRD source | How it works |
|-------------|--------------|
| **Reddit Trends** | r/popular hot posts via Reddit's public Atom feed |
| **Twitter/X Trends** | **Google Trends** trending searches (keyless stand-in — X's API is paid) |
| **YouTube Trends** | Trending videos via **Piped** (keyless YouTube proxy) |
| **Telegram Channels (public)** | Public channel post previews via `t.me/s/…` |
| **RSS** | **Hacker News** front page (Algolia) as a tech/RSS feed |

Pick a source tab → a live feed (each item opens the original). The **Social Buzz**
overlay geoparses posts against the shared gazetteer and plots where online
conversation is geographically focused (click a hotspot for the top post).

### How it works

Each platform is read from a **free, keyless** endpoint — Reddit's Atom RSS (its
`.json` now requires auth), Google Trends RSS, Hacker News' Algolia API, a public
Piped instance for YouTube, and Telegram's public web previews. Posts are normalized
to a common shape and **geoparsed** with the same gazetteer as Module 11, so social
buzz gets a map presence. Every feed is cached server-side; a labelled sample is
served if a source is unreachable.

> **Twitter/X** no longer offers free API access, so **Google Trends** stands in for
> search/X-style trend signals — clearly labelled in the panel. Telegram and YouTube
> (Piped) depend on public endpoints that can rate-limit; those tabs fall back to a
> sample when unavailable.

### Free & open data sources (no keys)

- **Reddit** — public Atom feed · **Trends** — [Google Trends RSS](https://trends.google.com/)
- **YouTube** — [Piped](https://github.com/TeamPiped/Piped) · **Hacker News** — [Algolia HN API](https://hn.algolia.com/api)
- **Telegram** — public `t.me/s/` channel previews

See [`docs/MODULE-12.md`](docs/MODULE-12.md) for the test checklist & details.

---

## Tech stack

**Frontend:** React 18 · TypeScript · Vite · Redux Toolkit · MapLibre GL JS 5 ·
Tailwind CSS · lucide-react.
**Backend (`apps/api`):** Node · Express · TypeScript (run with `tsx`).

Further BRD services (WebSocket gateway, workers, the databases) arrive with the
modules that need them.
