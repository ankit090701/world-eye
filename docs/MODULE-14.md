# Module 14 — Alert Engine

Turns the live data from every prior module into actionable alerts: build rules, they
evaluate live data in real time, fire alerts (in-app + on the map) and deliver to
Slack / Discord / webhooks. Free & keyless.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for tracking data +
webhook delivery.

---

## Feature walkthrough & test checklist

- [ ] Open the **Alerts** panel (bell icon, left dock). Two rules ship enabled:
      *Aircraft emergency squawk* and *Major earthquake (M5+)*.
- [ ] **Alerts tab** — the M5+ rule fires against live USGS data on load (there is
      usually a recent M5+ quake); you'll see a **toast**, entries in the feed, and
      **markers on the map**. Click a feed entry to fly to it.
- [ ] **Rules tab → New alert rule** — create one:
  - **Speed**: aircraft > e.g. 500 kt (or fleet km/h).
  - **Geo-fence**: pick a radius, click **Use map centre** to set the zone — the amber
    **Alert Zone** is drawn; aircraft/fleet entering it fire.
  - **Earthquake / Cyclone**: set a magnitude / category threshold.
  - **Cyber threat active**: fires while malicious infrastructure is tracked.
  - Choose **severity** and **channels**, then **Create rule**.
- [ ] Toggle a rule off/on, or delete it. Rules persist across reloads (localStorage).
- [ ] **Channels tab** — paste a **Slack / Discord / Webhook** URL, enable it, and hit
      **Test**: the API relays a test message and reports *sent ✓* (try a real Slack or
      Discord webhook, or `https://httpbin.org/post`). Email/SMS are stored stubs.
- [ ] Switch basemap — alert zones and markers persist.
- [ ] Modules 1–13 still work: alerts evaluate alongside every tracking layer; nothing
      about the other modules changes.

---

## Architecture

```
Browser (apps/web)                              apps/api (Express, :8787)
──────────────────                              ─────────────────────────
AlertEngine  ── subscribes to live stores        POST /api/alerts/deliver
  (aircraft · fleet · weather · cyber threats)      → SSRF-guard (https, no private hosts,
  → matchRule() per enabled rule                      no redirects) → Slack / Discord / webhook
  → cooldown de-dup → AlertEvent
     • toast   • feed (redux, persisted rules)
     • map markers (severity-coloured)
     • deliver ▶ /api/alerts/deliver
AlertZoneSync ▶ geo-rule circles on the map
```

- **Rules** (`alertsSlice`, persisted to `localStorage`) have a type, source, params,
  severity and channels. `lib/alertEval.ts` holds pure matchers + haversine + circle
  geometry.
- **Evaluation** runs in `AlertEngine` whenever any subscribed store updates. A
  module-level **cooldown map** (`ruleId:objectKey` → last-fired) suppresses re-fires for
  5 min, and each rule is capped at 25 alerts per evaluation.
- **Delivery.** The browser can't POST to Slack/Discord (CORS), so the API relays.
  `POST /api/alerts/deliver` **validates the webhook URL** (https only; blocks localhost,
  `.local`/`.internal`, and private/loopback/link-local/CGNAT/cloud-metadata IPs;
  disables redirects) and is per-IP rate-limited. It shapes the body per service
  (Slack `{text}`, Discord `{content}`, generic `{source,text,at}`).
- **Same map plumbing as Modules 1–13** — alert zones + fired-alert markers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/alerts/deliver.ts`, `POST /api/alerts/deliver` in `apps/api/src/index.ts` |
| Logic / state | `apps/web/src/lib/alertEval.ts`, `store/alertsSlice.ts`, `api/alertsApi.ts` |
| Map / engine | `apps/web/src/map/alerts/AlertLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/AlertsPanel.tsx` |

---

## Notes / limitations

- **Evaluation sources.** The engine wires the stores that carry per-object live state:
  **aircraft** (emergency / speed / geo), **fleet** (speed / geo), **weather events**
  (earthquake / cyclone) and **cyber threats**. Weather/cyclone/threat rules require that
  layer's engine to be polling (weather events + threats are on by default).
- **Delivery scope.** Slack / Discord / generic webhooks deliver for real to URLs **you**
  provide. Email & SMS need a provider (SendGrid / Twilio) and are intentionally stubbed —
  the config is stored so wiring a provider later is a drop-in.
- **SSRF caveat.** The guard blocks IP-literal private ranges and known-internal
  hostnames and disables redirects; a public hostname that *resolves* to a private IP
  (DNS-rebinding) is not caught by hostname checks alone. Fine for a self-hosted tool
  where you enter your own webhooks; a hardened deployment should resolve-then-check.
- **Cooldown** is per object per rule (5 min) so a persistent condition (e.g. an ongoing
  emergency) alerts once, not every tick.
