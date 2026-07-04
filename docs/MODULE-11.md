# Module 11 — News Intelligence

Global news, categorised and **mapped**: breaking news, disasters, conflict,
economic and political events, plus trending topics — with headlines geoparsed onto
the world map. Free & keyless (Google News RSS + a built-in gazetteer).

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for the news feeds.

> No API keys. News from **Google News RSS**; locations inferred from headlines.

---

## Feature walkthrough & test checklist

- [ ] Open the **News** panel (newspaper icon, left dock). The **Breaking** feed loads.
- [ ] Switch category tabs — **Breaking · Disasters · Conflict · Economy · Politics**.
      Each shows a live headline feed; a *live* / *sample* badge indicates the source.
- [ ] Click any headline → it opens the source article in a new tab.
- [ ] **Trending** chips show the most-mentioned names/places across current headlines.
- [ ] Each article shows its **source**, **time-ago**, and a **place** badge when a
      location was detected in the headline.
- [ ] **News Hotspots** overlay (on by default, toggle in the panel or Layers): dots
      where news is happening, colour-coded by category, sized by story count. Click a
      dot → popup with the place, story count and top headline (links out).
- [ ] Switch basemap — the news hotspots persist.
- [ ] Modules 1–10 still work: all tracking / weather / satellite layers run alongside
      the news hotspots; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
NewsPanel ── GET /api/news/feed?category ▶ /feed     → Google News RSS (per category) → geoparse
          ── GET /api/news/trending      ▶ /trending → proper-noun frequency across headlines
NewsEngine ─ GET /api/news/map           ▶ /map      → geoparsed hotspots (aggregated by place)
NewsSync / NewsInteractions ▶ map (category-coloured hotspots + linked popups)
```

- **Feeds.** Each category maps to a Google News RSS query (breaking = top stories);
  the API parses the RSS (no XML dependency — a small, entity-decoding parser) into
  normalized articles.
- **Geoparsing.** Every headline is matched against a **built-in gazetteer** of ~140
  countries and major cities (longest-name-first, word-boundary, precompiled regexes)
  to assign coordinates — so news gets a map presence with no paid geocoder.
- **Hotspots.** `/map` aggregates geolocated headlines from the disasters / wars /
  political feeds into per-place points (sized by story count, coloured by category).
- **Trending.** Frequency of capitalised proper-noun terms across current breaking
  headlines (month/weekday/stopword-filtered), padded with the strongest single
  mentions so it's never empty.
- **Same map plumbing as Modules 1–10** — the news source/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump; hotspots repopulate
  from the store after a basemap switch. Each feed is cached server-side (8–10 min).

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/news/*` (rss, gazetteer, sources, simulator, types), `/api/news/*` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/newsStore.ts`, `store/newsSlice.ts`, `api/newsApi.ts` |
| Map | `apps/web/src/map/news/NewsLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/NewsPanel.tsx` |

---

## Notes / limitations

- **Headline geoparsing is approximate.** Location is inferred from headline text, so
  some articles map to no place (headline mentions none in the gazetteer) and rare
  false positives are possible (e.g. a country name used generically). It's an
  at-a-glance "where news is happening" view, not authoritative geocoding.
- **Google News RSS links** are Google redirect URLs that resolve to the publisher —
  clicking a headline opens the original article.
- **Why not GDELT?** GDELT is powerful but rate-limits to one request per 5 s and its
  GEO endpoint was unavailable; Google News RSS is reliable and keyless, so it's the
  primary source here.
- **Trending** reflects a single breaking feed, so on quiet news days it leans on the
  strongest single mentions; on busy days it surfaces genuinely repeated topics.
- Popup/article links are HTML-escaped and restricted to `http(s)` URLs.
