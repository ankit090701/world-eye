# Module 13 — OSINT Search

Investigate emails, usernames, phone numbers and companies from **public /
consent-based sources only**. Free & keyless. No private-data lookups.

---

## How to run

```bash
npm install      # from repo root  (installs libphonenumber-js)
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. The **API must be running** for lookups.

> No API keys. Gravatar · XposedOrNot · GitHub/GitLab/HN/DEV · libphonenumber-js · Clearbit · Wikipedia.

---

## Feature walkthrough & test checklist

- [ ] Open the **OSINT** panel (scan icon, left dock). Pick a search type tab.
- [ ] **Email** (`test@gmail.com`, `info@github.com`): report shows **deliverability**
      (MX), **disposable/free** flags, **breach exposure** (count + breach names),
      any **public Gravatar** profile, and the **mail-host** org/country (dropped on
      the map).
- [ ] **Username** (`torvalds`, `gaearon`): a **GitHub** card (avatar, name, bio,
      company, location, followers, repos) + a **public-profile presence** list
      (GitHub / GitLab / Hacker News / DEV) with links.
- [ ] **Phone** (`+14155552671`, `+442071838750`): **country** (flag + name),
      **calling code**, **line type**, and national/international formats. Set the
      little **country box** (e.g. `US`) to parse a number without a `+` code. The
      country is located on the map.
- [ ] **Company** (`Anthropic`, `GitHub`): top match (**logo + domain**), a
      **Wikipedia overview** (thumbnail + summary), other matches, and HQ/hosting
      location on the map.
- [ ] Closing the panel removes the result marker; switching tabs clears the report.
- [ ] Modules 1–12 still work: all tracking / weather / satellite / news / social
      layers run alongside; basemap switches preserve everything.

---

## Architecture

```
Browser (apps/web)                       apps/api (Express, :8787)
──────────────────                       ─────────────────────────
OsintPanel ── GET /api/osint/lookup?kind=&q= ▶ buildOsintReport(kind, q)
  (kind = email | username | phone | company)      ├─ email → Gravatar · XposedOrNot · DoH(MX) · ip-api
  → drops a result marker where a location exists   ├─ username → GitHub API · GitLab · HN · DEV
                                                     ├─ phone → libphonenumber-js (offline) → country map
                                                     └─ company → Clearbit suggest · Wikipedia · domain geo
```

- **Email** checks format, resolves **MX** (deliverability) via Google DoH, flags
  disposable/free providers, looks up a **public Gravatar** profile (by email MD5),
  queries **XposedOrNot** for public breach notifications, and geolocates the mail
  host (A-record → ip-api).
- **Username** pulls the rich **GitHub** profile and checks presence on GitLab,
  Hacker News and DEV via their public APIs.
- **Phone** uses **libphonenumber-js** entirely offline — it parses the number into
  country, line type and formats **from the number itself**; there is no owner or
  subscriber lookup. The country is placed on the map from a built-in centroid table.
- **Company** uses Clearbit's public autocomplete (name → domain + logo), a Wikipedia
  summary, and falls back to the domain's hosting location for the map marker.
- Reuses Module 7/8 helpers (`doh`, `geoIp`) and the Module 11 gazetteer.

### Scope & responsible use (important)

This module is intentionally limited to the BRD's stated scope — **public and
consent-based data only**:

- **No owner/subscriber lookup** for phone numbers — metadata from the number only.
- Only **public** profiles and **public** breach notifications (the same exposure
  signals a defender checks for themselves) — no private inboxes, protected content,
  or login-walled scraping.
- The query hits **fixed public services** as an encoded parameter (no SSRF to
  arbitrary hosts). The route validates the kind, caps query length at 200, applies a
  per-IP rate limit (15/min → `429`), and caches results 10 min.

### Key files

| Area | Files |
|------|-------|
| Backend | `apps/api/src/osint/*` (sources, report, countries, types), `/api/osint/lookup` in `apps/api/src/index.ts` |
| Data / state | `apps/web/src/store/osintSlice.ts`, `api/osintApi.ts` |
| UI | `apps/web/src/components/panels/OsintPanel.tsx` (result marker; no toggleable layer) |

---

## Notes / limitations

- **Breach data** (XposedOrNot) reflects historical public breach corpora; a hit means
  the address appeared in a known public breach, not that it is currently compromised.
- **Username presence** covers a curated set of platforms with reliable public APIs
  (many sites block automated existence checks); absence there doesn't prove a name is
  unused elsewhere.
- **Phone** metadata is prefix-based (country, line type) — carrier/owner details
  require paid HLR lookups and are intentionally out of scope.
- **Company** autocomplete is fuzzy; the panel prefers an exact-name match and lists
  the other suggestions so you can disambiguate.
- Avatars/logos/thumbnails load from the source providers (Gravatar, GitHub, Clearbit,
  Wikipedia).
