# Module 7 — Cyber Intelligence

IP / domain / ASN OSINT lookups + a live malicious-infrastructure overlay. Free,
keyless sources. **No active port scanning** (authorized targets only).

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for lookups + threats.

> No API keys. Sources: ip-api · RDAP · Google DoH · crt.sh · abuse.ch Feodo · Tor.

---

## Feature walkthrough & test checklist

- [ ] Open the **Cyber** panel (shield icon, left dock). Try an **example** chip
      (`8.8.8.8`, `github.com`, `AS15169`, `1.1.1.1`) or type your own.
- [ ] For an **IP** → report shows: threat **verdict** (LISTED / no known threat),
      **Geolocation** (country/city/ISP/org/cloud), **ASN**, **WHOIS/RDAP**
      (network, CIDR, range, entities), **DNS/PTR**, and the gated **Open ports**
      note. The IP is located on the map (marker + fly-to).
- [ ] For a **domain** → also shows **DNS records** (A/AAAA/MX/NS/TXT) and
      **Certificates** (issuer/CN/validity from crt.sh); it resolves + geolocates.
- [ ] For an **ASN** → shows the AS name/country + RDAP entities.
- [ ] Threat **flags** render for known-bad hosts: C2 (malware family), Tor exit,
      proxy/VPN, hosting/DC.
- [ ] **Cyber Threats** overlay: red markers of geolocated **botnet C2 servers**
      (live from abuse.ch Feodo). Click one → popup (IP, malware, country, ASN).
      Toggle it in the panel or Layers.
- [ ] Modules 1–6 still work: activity/timeline/tools + all 5 tracking/traffic
      layers run alongside the threat overlay; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
CyberPanel ── GET /api/cyber/lookup?q ──▶ /lookup → buildReport(q)
  (on-demand IP/domain/ASN report)                   ├─ ip-api (geo/ISP/ASN/flags)
CyberThreatEngine ─ GET /api/cyber/threats           ├─ RDAP (whois: ip / autnum)
  (polls 60s; plots C2 servers)                      ├─ Google DoH (DNS + reverse)
CyberThreatSync/Interactions ▶ map                   ├─ crt.sh (certs)
                                                     └─ abuse.ch Feodo + Tor (threat)
                            /threats → threatMapPoints (Feodo C2 + ip-api batch geo)
```

- **Lookup orchestrator** (`report.ts`) classifies the query (IP / domain / ASN),
  then fans out to the relevant sources. Every source **catches its own errors**
  (returns null/[]), so a partial outage degrades the report instead of failing it.
- **Threat map** geolocates the abuse.ch Feodo C2 list via ip-api's batch endpoint
  (cached 30 min), with a small synthetic fallback so the overlay always renders.
- **Same map plumbing as Modules 1–6** — the threat source/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump. Circles only (no
  icon image).

### Security / responsible use

- **No active port scanning.** WorldEye never connects to the *target* host — all
  lookups go to **fixed public OSINT services** with the query passed as an encoded
  path/parameter (no SSRF to internal networks). "Open ports" is gated behind a
  documented authorized-scan integration that is not enabled.
- Lookups are cached 5 min server-side; abuse.ch/Tor lists cached ~1 h.
- **Abuse guardrails.** `/api/cyber/lookup` caps the query at 200 chars and applies
  a per-IP rate limit (20 uncached lookups / min → `429`) so one client can't drain
  the shared free-tier upstream quotas (ip-api free = 45/min).
- **Untrusted feed data is escaped.** Threat-map popup values come from external
  feeds (abuse.ch, and ip-api over HTTP on the free tier), so they're HTML-escaped
  before rendering — a tampered/spoofed upstream can't inject markup.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/cyber/*`, `/api/cyber/*` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/cyberThreatStore.ts`, `store/cyberSlice.ts`, `api/cyberApi.ts` |
| Map | `apps/web/src/map/cyber/CyberLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/CyberPanel.tsx` |

---

## Notes / limitations

- **ip-api** free tier is HTTP + rate-limited (45/min single, 15/min batch) — fine
  for interactive use; the backend caches aggressively.
- **crt.sh** can be slow/occasionally empty — certificates are best-effort.
- abuse.ch **query** APIs (URLhaus/ThreatFox) now require a free key; WorldEye uses
  only the **keyless Feodo blocklist**, so no key is needed.
