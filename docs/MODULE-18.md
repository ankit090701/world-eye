# Module 18 — Admin

The administration console: user management, role permissions, audit logs, API keys,
usage analytics, billing and organizations. Audit and usage are **live**; the rest is
local demo data (no auth backend in this keyless build).

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**, use a few panels/lookups (to generate audit + usage),
then open the **Admin** panel.

---

## Feature walkthrough & test checklist

- [ ] Open the **Admin** panel (shield icon, left dock).
- [ ] **Users** tab — the seeded team lists with roles. **Add** a user (name/email/role),
      change a role inline, toggle active, or remove one. Below, the **role → permission
      matrix** shows what each of the 5 BRD roles can do.
- [ ] **Keys** tab — **Generate** an API key: the full token is shown **once** (copy it);
      the list stores only `prefix…last4`. **Revoke** or delete a key.
- [ ] **Audit** tab — a **live** log: open panels, run a Cyber/Domain/OSINT lookup, create
      an alert rule or generate a report, then return here to see those actions recorded
      (with actor + time). **Clear** empties it.
- [ ] **Usage** tab — **live** API-call counts by category (aircraft, weather, cyber…),
      updating as the app polls, plus a **plan & billing** overview (demo quota bar).
- [ ] **Orgs** tab — organizations with plan & members; add/remove.
- [ ] Reload — users, keys and orgs persist (localStorage); audit/usage reset per session.
- [ ] Modules 1–17 still work: the console reads/records but changes nothing about them.

---

## Architecture

```
Browser (apps/web)
──────────────────
AdminPanel (Users · Keys · Audit · Usage · Orgs)
   ├─ adminSlice ── users / apiKeys / orgs (localStorage) · audit (session)
   ├─ auditMiddleware ── Redux middleware: watches meaningful actions
   │                     (ui/setActivePanel, cyber/domain/osint lookupOk,
   │                      alerts/addRule, reports/addRecent, admin/*) → logAudit
   ├─ usageStore + installUsageTracker ── one-time window.fetch interceptor,
   │                                       counts /api/<category> calls (live)
   └─ lib/permissions.ts ── role → permission matrix
```

- **Live audit trail.** `auditMiddleware` sits in the Redux middleware chain and turns
  selected actions into audit entries (actor = current admin user, time, action, target,
  severity). No polling, no seeding — it reflects what you actually did.
- **Live usage analytics.** `installUsageTracker()` (called once at store boot) wraps
  `window.fetch` and increments a per-category counter for every WorldEye API request;
  the interceptor never alters or breaks the request.
- **Secure keys.** Tokens are generated with `crypto.getRandomValues`; the full token is
  shown once and never persisted — only `prefix…last4` is stored.
- **Roles & permissions** come from a static matrix mapping the BRD's five roles to
  WorldEye capabilities.

### Key files

| Area | Files |
|------|-------|
| State | `apps/web/src/store/adminSlice.ts`, `apps/web/src/store/auditMiddleware.ts` |
| Usage | `apps/web/src/data/usageStore.ts` |
| Permissions | `apps/web/src/lib/permissions.ts` |
| UI | `apps/web/src/components/panels/AdminPanel.tsx` |

(No new API route — `/api/health` reports module 18 as present.)

---

## Notes / limitations

- **No auth backend.** This keyless build has no login / RBAC enforcement — the Admin
  panel is a management console over **local demo data** (users, keys, orgs, billing),
  clearly labelled in-panel. A production deployment stores these in the database, gates
  every route with the assigned role, and **validates API keys server-side** (the demo
  API currently runs open).
- **Audit & usage are genuinely live** and reset per browser session (audit is not
  persisted; usage counts since page load).
- **Billing** figures (quota, cost) are a demo overview driven by live session usage;
  real metered billing would run server-side.

---

## Project status

Module 18 completes the **WorldEye BRD (all 18 core modules)**. Every capability runs on
free, keyless data sources, or is explicitly scoped/labelled where a real provider or
backend would be required (fleet telematics, authorized port-scanning, LLM, auth/billing).
