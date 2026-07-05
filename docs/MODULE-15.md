# Module 15 — AI Intelligence

A situational-analysis layer and assistant that reasons over the live data from every
prior module: natural-language Q&A, situation summaries, a risk index, anomaly/pattern
detection, an outlook, a downloadable report and a chat assistant. **Keyless** — runs
client-side over the data the platform already streams.

---

## How to run

```bash
npm install      # from repo root
npm run dev      # web (:5173) + API (:8787)
```

Open **http://localhost:5173**. Keep the app open a few seconds so the tracking feeds
populate, then open the **AI** panel.

---

## Feature walkthrough & test checklist

- [ ] Open the **AI** panel (sparkle icon, left dock).
- [ ] **Risk gauge** shows a 0–100 index with a level (low → severe) and the top drivers,
      updating live as data arrives.
- [ ] **Metric tiles** show current aircraft / vessels / quakes / cyclones / threats /
      satellites counts.
- [ ] **Chat** — type or tap a quick action:
  - *“Situation summary”* → a one-paragraph global brief.
  - *“Current risk”* → the risk score + main drivers.
  - *“Any anomalies?”* → notable events; each has a **map jump** button.
  - *“Outlook”* → near-term forecast statements.
  - *“Strongest earthquake”*, *“active storms”*, *“emergencies”*, *“cyber threats”*,
    *“how many satellites”* … → answered from live data, often with a “show on map” chip.
  - *“help”* → the full capability list.
- [ ] **Generate report** → a full markdown situation report appears; **.md** downloads it.
- [ ] Chat history persists while the app is open; **clear** resets it.
- [ ] Modules 1–14 still work: the AI panel only reads their data; nothing changes for them.

---

## Architecture

```
Browser (apps/web)
──────────────────
AiPanel ─ dashboard (risk gauge + metrics) · chat · report
   │
   ▼  gatherContext()  ── reads the live stores (read-only):
lib/aiEngine.ts            aircraft · ships · trains · fleet · traffic ·
   ├─ computeRisk()        weather events · cyber threats · satellites · news · social
   ├─ generateSummary()
   ├─ detectAnomalies()  ─▶ answers + map actions (flyTo)
   ├─ forecast()
   ├─ generateReport()   ─▶ markdown (download)
   └─ answerQuery()      ─▶ intent-routed natural-language reply
```

- **Client-side.** The operational data already lives in the browser (each module's
  `useSyncExternalStore` stores). Module 15 reads those snapshots directly — no round
  trip, no new API, no keys.
- **Risk model.** A transparent weighted sum: aircraft emergencies, major earthquakes
  (M5+), major cyclones (Cat 3+), tracked C2 hosts, high-severity traffic, wildfires and
  critical fleet alerts — each capped, summed and clamped to 0–100 with named factors.
- **NL routing.** `answerQuery` classifies the question by keywords and answers from the
  gathered context; where a result has coordinates it returns **actions** the panel turns
  into “show on map” buttons.
- **Report.** `generateReport` renders a markdown sitrep (summary · risk factors ·
  notable activity · outlook · totals) downloaded via a Blob.

### Key files

| Area | Files |
|------|-------|
| Engine | `apps/web/src/lib/aiEngine.ts` |
| State | `apps/web/src/store/aiSlice.ts` (chat history) |
| UI | `apps/web/src/components/panels/AiPanel.tsx` |

(No new API route — `/api/health` simply reports module 15 as present.)

---

## Notes / limitations

- **Keyless computed intelligence, not an LLM.** Answers come from intent routing +
  templated language + heuristic models, so phrasing is structured rather than free-form.
  This makes it deterministic, fast and free — and it's clearly labelled in the panel.
- **LLM upgrade path.** The design separates *context gathering* from *answering*, so a
  real model (Claude via `ANTHROPIC_API_KEY`) can be dropped in to generate the reply from
  the same context, with this engine as the always-on fallback.
- **“Object Detection”** is interpreted as anomalous-object detection over the tracked
  feeds (emergency aircraft, major quakes, severe cyclones, C2 spikes) — there is no
  image/vision pipeline in scope.
- **Live-data dependency.** Answers reflect what's currently loaded: aircraft/ships are
  viewport-scoped, and a domain reads as `0` until its layer/engine has fetched (weather,
  threats and satellites are on by default).
