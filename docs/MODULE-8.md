# Module 8 — Domain Intelligence

Deep domain OSINT (WHOIS, DNS, email security, certificates, subdomains, history)
plus a geolocated **hosting-footprint** map overlay. Free, keyless sources.
**Passive OSINT only** — no active scanning of the target.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for lookups.

> No API keys. Sources: RDAP · Google DoH · certspotter (crt.sh fallback) · ip-api.

---

## Feature walkthrough & test checklist

- [ ] Open the **Domain** panel (globe icon, left dock). Try an **example** chip
      (`github.com`, `wikipedia.org`, `anthropic.com`, `kagi.com`) or type your own.
- [ ] The report shows:
  - [ ] **WHOIS / Registration** — registrar, created / updated / expiry dates,
        DNSSEC, statuses, nameservers (RDAP).
  - [ ] **Email security** — **SPF** policy, **DMARC** policy (+ pct), **DKIM**
        selectors found, and detected **mail provider**.
  - [ ] **DNS records** — A / AAAA / MX / NS / CNAME / CAA / TXT (Google DoH).
  - [ ] **Hosting** — IP, org, ISP, ASN, location, and a **cloud-provider** badge.
  - [ ] **Infrastructure footprint** — count of hosts + countries, with a
        *Show on map* toggle.
  - [ ] **Certificates** — issuer / CN / validity (certspotter).
  - [ ] **Subdomains** — passive enumeration from certificate-transparency logs.
  - [ ] **Historical DNS / CT activity** — when each (sub)domain first appeared.
- [ ] On lookup, the **Domain Infrastructure** overlay appears: apex / www / mail /
      NS / subdomain hosts as colour-coded nodes linked to the apex; the map flies
      to fit them. Click a node → popup (host, role, IP, org, location).
- [ ] Toggle the overlay from the panel (*Show on map*) or the **Layers** panel
      (*Domain Infrastructure*). Switch basemap — the overlay persists.
- [ ] **clear report** removes the report and the map nodes.
- [ ] Modules 1–7 still work: all tracking/traffic/cyber layers run alongside the
      domain overlay; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                        apps/api (Express, :8787)
──────────────────                        ─────────────────────────
DomainPanel ── GET /api/domain/lookup?q ─▶ /lookup → buildDomainReport(q)
  (on-demand domain report)                          ├─ RDAP domain (registrar/dates/NS/DNSSEC)
DomainInfraSync/Interactions ▶ map                   ├─ Google DoH (A/AAAA/MX/NS/TXT/CNAME/SOA/CAA)
  (plots geolocated hosting footprint)               ├─ email: SPF (TXT) · DMARC (_dmarc) · DKIM probe
                                                      ├─ certspotter → crt.sh (certs/subdomains/history)
                                                      ├─ ip-api (apex hosting geo/ASN/cloud)
                                                      └─ infra: resolve hosts → ip-api batch geo
```

- **Orchestrator** (`report.ts`) validates + normalises the domain, then fans out.
  Independent sources (RDAP, DNS, CT) run first; dependent ones (email needs TXT/MX,
  hosting needs the apex IP, footprint needs DNS + subdomains) run next. **Every
  source catches its own errors**, so a partial outage degrades the report.
- **Certificate transparency** uses **certspotter** (keyless, fast, reliable) as the
  primary source and **crt.sh** as a fallback (crt.sh is frequently overloaded). One
  fetch feeds certificates, subdomain enumeration and the CT history timeline.
- **Infrastructure footprint** resolves the apex, `www`, up to 2 MX, up to 2 NS and
  up to 6 subdomains to IPs, dedupes, batch-geolocates them, and returns nodes with a
  role. The frontend draws a star topology (apex → every node) and fits the map.
- **Same map plumbing as Modules 1–7** — the `domain-infra` source/layers are added in
  `installOverlays()` and re-applied on every `styleEpoch` bump. The overlay is
  populated **on lookup** (not polled), mirroring the cyber marker.

### Security / responsible use

- **Passive OSINT only.** WorldEye never connects to the *target* host and never
  scans it — it reads public registries (RDAP), public DNS (Google DoH) and public
  certificate-transparency logs. The query is validated as a domain, normalised, and
  passed only as an encoded parameter to **fixed** services (no SSRF).
- **Abuse guardrails.** `/api/domain/lookup` caps the query at 200 chars, validates
  it is a real domain, and shares the per-IP rate limiter with the cyber route
  (20 uncached lookups / min → `429`). Results cached 10 min.
- **Untrusted feed data is escaped.** Infra-popup values come from DNS / CT / ip-api,
  so they're HTML-escaped before rendering.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/domain/*`, `/api/domain/lookup` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/data/domainInfraStore.ts`, `store/domainSlice.ts`, `api/domainApi.ts` |
| Map | `apps/web/src/map/domain/DomainLayer.tsx`, additions in `map/mapLayers.ts` + `map/ids.ts` |
| UI | `apps/web/src/components/panels/DomainPanel.tsx` |

---

## Notes / limitations

- **certspotter** (keyless) returns the most recent CT issuances, so the CT
  *history* / *first seen* reflects the available window — the true domain age is the
  WHOIS **created** date. Its free tier is rate-limited; the backend caches 10 min.
- **Very large domains** (e.g. `cloudflare.com`, `google.com`) have millions of CT
  entries; certspotter can exceed the timeout and crt.sh (fallback) is often down —
  so certs/subdomains/history may be empty for those. WHOIS / DNS / email / hosting /
  footprint still render.
- **DMARC/DKIM** are probed via DNS (`_dmarc.<domain>` and common `<selector>.
  _domainkey.<domain>` selectors); absence of a probed selector doesn't prove there
  is no DKIM, only that the common selectors weren't found.
- **RDAP** coverage varies by TLD; a few registries don't expose RDAP, in which case
  WHOIS is noted as unavailable while the rest of the report still populates.
