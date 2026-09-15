# Festival Forecaster v1.2 — BUILD_STATUS

**Date:** 2026-09-15  
**Status:** Usable SPA + engine PASS at N=7888 + RFID + Safety/Weather + multi-tab blank `.xlsx` pack + **Phase 2 MC journey presentation (ROS gate)**

## What works

- Deterministic P&L from `budget_model.json` (`js/budget_engine.js`)
  - fixed / per_ticket / hybrid venue / sales_tax C80 / **C54 = 0.03×K22 dynamic**
  - K2 be_rate rollups; K22 camper/non-camper; K24 / K30 / K47
  - Ancillaries scale N/N0 (overridable); wizard modifiers after base; marketing % slider + hard cap
- **Node self-test PASS:** `node scripts/verify_engine.js` — all dollar cells within $1 of `sheet_targets_at_N0`
- UI **Reconcile at N=7888** button (same targets)
- Monte Carlo 5000 draws, presets, P10/P50/P90, tornado, one plain sentence
- **Phase 2 journey presentation**
  - ROS gate: Use my ROS | Generate skeleton → Confirm | Edit | Cancel
  - Run Monte Carlo **disabled** until Confirm ROS
  - Journey rail (10 stages; camping hidden when off) + OPS + CROWD feeds, pause/scrub, 20–40s clock
  - Numbers first, then optional Replay P10/P50/P90 + debrief
  - Curated `js/crowd_bank.js` (no confession xlsx); `filterBanned()`
  - Health-protocol intensity toggle default OFF (ESA 6ft / 100.4F / 14-day only when ON)
- Competitors wired to **full** `festivals.json` (26,780) via **fetch** + `CompetitorScore.topN`
- SVG poster download (no fake headliners)
- **v1.1 blank pack:** SheetJS CDN → multi-tab `.xlsx` workbooks
- localStorage drafts
- **RFID / Cashless** optional add-on — `node scripts/verify_rfid.js`
- **Safety / Weather** optional add-on — `node scripts/verify_safety_weather.js`

## How to open

```bash
cd /workspace/forecast_sim_event && python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

## Gaps / notes

- Default wizard (music focus on, camping on, marketing 16% of opex) **changes** live P&L vs raw sheet; use Reconcile button for baseline PASS table.
- Directory dates are mostly 2017–2022 → nearly all matches show stale label (expected).
- ESA / safety sheets are **blank checklists** — not a safety plan and not legal advice.
- Crowd feed is color/narrative only; it does not drive P&L unless echoing an already-applied shock.
- No login / multi-app / SaaS.

## Paths created/updated (v1.2)

```
js/ros_gate.js
js/crowd_bank.js
js/ops_bank.js
js/mc_presentation.js
js/monte_carlo.js          (pickRepresentativeDraw / drawsDetail — math unchanged)
js/app.js                  (ROS gate + journey wiring)
index.html
css/app.css
README.md
BUILD_STATUS.md
```

Prior v1.1 paths unchanged: engine, RFID, safety_weather, templates, festivals.json, verify_*.js.
