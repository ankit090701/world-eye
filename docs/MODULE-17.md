# Module 17 — Reports

Turn the live operational picture into shareable documents: **PDF**, **Excel**, **CSV**,
Markdown and JSON, plus **scheduled** recurring reports. All generated in the browser —
free and keyless.

---

## How to run

```bash
npm install      # from repo root  (installs jspdf + write-excel-file)
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**, let the feeds populate, then open the **Reports** panel.

---

## Feature walkthrough & test checklist

- [ ] Open the **Reports** panel (document icon, left dock), **Generate** tab.
- [ ] Pick a report type — **Situation** / **Analytics** / **Full** — and **Generate**.
      A live **preview** renders (summary, risk factors, notable activity, tables…).
- [ ] Export the report and check each downloads & opens:
  - [ ] **PDF** — a paginated, titled `.pdf` (jsPDF).
  - [ ] **Excel** — a real `.xlsx` that opens cleanly in Excel/Sheets (write-excel-file).
  - [ ] **CSV** — sections + tables, opens in any spreadsheet.
  - [ ] **MD** / **JSON** — markdown and structured JSON.
- [ ] **Recent reports** list keeps what you generated; re-download the markdown.
- [ ] **Scheduled** tab → add a schedule (type, interval, delivery **notify** or
      **webhook** + URL) → it appears in the list; toggle/enable/delete it. Schedules
      persist across reloads.
- [ ] With a schedule enabled, within ~1 minute you get a toast and a new entry in the
      recent list (and a webhook POST if configured — try a real Slack/Discord webhook).
- [ ] Modules 1–16 still work: report generation only reads their data; nothing changes.

---

## Architecture

```
Browser (apps/web)
──────────────────
ReportsPanel                              apps/api (Express, :8787)
   ├─ buildReport(kind)  ── reuses ───▶   (report generation is client-side)
   │    Module 15 aiEngine (summary/risk/anomalies/outlook)
   │    Module 16 analytics (distributions/clusters)
   ├─ toMarkdown / toCsv / toJson         POST /api/alerts/deliver  ← scheduled webhook
   ├─ toPdf   → import('jspdf')  (code-split)      (SSRF-guarded, shared with Module 14)
   └─ toExcel → import('write-excel-file/browser') (code-split)
ReportScheduler (mounted in MapView) ── every 60s ▶ runs due schedules → recent list + webhook
```

- **One report model, many renderers.** `lib/reportBuilder.ts` turns live data into a
  structured `Report` (sections of text / key-value / table); `toMarkdown`/`toCsv`/`toJson`
  render text formats; `lib/reportExport.ts` renders **PDF** and **Excel**.
- **Dynamic imports.** jsPDF (~390 KB) and write-excel-file load **only when you export**
  that format (`import()` code-splits them), so the main bundle stays lean.
- **Scheduler.** `ReportScheduler` checks schedules each minute; when one is due it builds
  the report, adds it to the recent list, toasts, and (for webhook delivery) POSTs a
  summary through the **Module 14 SSRF-guarded relay**. Schedules persist to `localStorage`.

### Key files

| Area | Files |
|------|-------|
| Builder / text | `apps/web/src/lib/reportBuilder.ts` |
| PDF / Excel | `apps/web/src/lib/reportExport.ts` |
| State | `apps/web/src/store/reportsSlice.ts` |
| Scheduler | `apps/web/src/map/reports/ReportScheduler.tsx` |
| UI | `apps/web/src/components/panels/ReportsPanel.tsx` |

---

## Notes / limitations

- **Excel library.** `write-excel-file` is used instead of SheetJS (`xlsx`) because it is
  write-only, actively maintained and **audit-clean** (SheetJS's high-severity advisories
  are in its *parse* path, which a writer doesn't use — but a clean `npm audit` is better
  for a shipped project).
- **In-app scheduling.** Schedules fire only while a WorldEye tab is open (checked each
  minute). A production deployment runs the identical builder on a server/worker cron.
- **Report content** reflects the currently-loaded live data (viewport-scoped feeds read
  as smaller/empty until fetched).
- **PDF tables** use a simple fixed-column text layout (no heavy table plugin) — clean and
  dependency-light; very wide tables are truncated per cell.
