# Module 12 — Social Intelligence

Trends and public posts from Reddit, Google Trends (a keyless X/search stand-in),
YouTube, Hacker News and public Telegram channels — with social buzz mapped. Free &
keyless.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for the social feeds.

> No API keys. Reddit RSS · Google Trends RSS · Hacker News (Algolia) · YouTube (Piped) · Telegram web.

---

## Feature walkthrough & test checklist

- [ ] Open the **Social** panel (share icon, left dock). The **Reddit** feed loads.
- [ ] Switch source tabs — **Reddit · Trends · YouTube · Hacker News · Telegram**.
      Each shows a live feed with a *live* / *sample* badge.
- [ ] Click any post → it opens the original (Reddit thread, trend, video, HN item…).
- [ ] Each row shows the **author/channel/subreddit**, a **metric** (comments /
      searches / views where available), **time-ago**, and a **place** badge when a
      location was detected.
- [ ] **Trends** shows Google Trends trending searches (with search volume) — the
      keyless stand-in for X/Twitter trends.
- [ ] **Social Buzz** overlay (toggle in the panel or Layers, magenta): dots where
      conversation is geographically focused; click one for the place + top post.
- [ ] Switch basemap — the social buzz hotspots persist.
- [ ] Modules 1–11 still work: all tracking / weather / satellite / news layers run
      alongside social buzz; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
SocialPanel ── GET /api/social/feed?source ▶ /feed → Reddit RSS · Google Trends RSS ·
                                                      HN Algolia · Piped · Telegram web
SocialEngine ─ GET /api/social/map         ▶ /map  → geoparsed buzz (aggregated by place)
SocialSync / SocialInteractions ▶ map (magenta hotspots + linked popups)
```

- **One fetcher per platform**, each normalized to a common `SocialPost`
  (title, author, url, score, meta, time, place). Reddit is read from its **Atom
  RSS** because the `.json` endpoint now blocks unauthenticated access; Trends from
  RSS; HN from Algolia JSON; YouTube from a public **Piped** instance (with a second
  instance as fallback); Telegram from public `t.me/s/` previews.
- **Geoparsing.** Post titles are matched against the **shared gazetteer** (Module 11)
  to assign coordinates, so `/map` can aggregate them into per-place buzz hotspots.
- **Resilience.** Each source is cached server-side (8–10 min); any source that is
  unreachable or rate-limited falls back to a labelled **sample** so every tab always
  renders. The buzz layer only polls while it's enabled (it's off by default).
- **Same map plumbing as Modules 1–11** — the social source/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/social/*` (sources, simulator, types), `/api/social/*` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/socialStore.ts`, `store/socialSlice.ts`, `api/socialApi.ts` |
| Map | `apps/web/src/map/social/SocialLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/SocialPanel.tsx` |

---

## Notes / limitations

- **Twitter/X** shut off free API access, so **Google Trends** stands in for
  search/X-style trend signals — labelled as such in the panel.
- **Reddit** blocks unauthenticated `.json`, so WorldEye uses its public **Atom RSS**
  (which omits score/comment counts); Reddit also rate-limits, hence the caching +
  sample fallback.
- **YouTube (Piped)** and **Telegram** rely on public community endpoints that can be
  down or rate-limited; those tabs degrade to a sample when unavailable.
- **Social buzz is sparse** by nature — most social posts mention no mapped place, so
  the hotspot layer is lighter than the news map. It's an at-a-glance signal, not a
  complete geolocation.
- Popup/post links are HTML-escaped and restricted to `http(s)` URLs.
