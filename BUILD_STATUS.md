# Festival Forecaster v1.1 — BUILD_STATUS

**Date:** 2026-09-15  
**Status:** Usable SPA + engine PASS at N=7888 + RFID + Safety/Weather optional add-ons (v1.1) + multi-tab blank `.xlsx` pack

## What works

- Deterministic P&L from `budget_model.json` (`js/budget_engine.js`)
  - fixed / per_ticket / hybrid venue / sales_tax C80 / **C54 = 0.03×K22 dynamic**
  - K2 be_rate rollups; K22 camper/non-camper; K24 / K30 / K47
  - Ancillaries scale N/N0 (overridable); wizard modifiers after base; marketing % slider + hard cap
- **Node self-test PASS:** `node scripts/verify_engine.js` — all dollar cells within $1 of `sheet_targets_at_N0`
- UI **Reconcile at N=7888** button (same targets)
- Monte Carlo 5000 draws, presets, P10/P50/P90, tornado, one plain sentence
- Competitors wired to **full** `festivals.json` (26,780) via **fetch** + `CompetitorScore.topN`
- Stale historical years → badge *"directory match, dates may be stale"*
- SVG poster download (no fake headliners)
- **v1.1 blank pack:** SheetJS CDN → multi-tab `.xlsx` workbooks (Talent, Artists marketing, Lineup announce, Go-to-market, ROS per show day, Area hours, Load-in, Transport, RFID/POS, Safety pack). Profile header stamp only; sensitive source details stripped; safety footer disclaimer
- localStorage drafts
- Budget baked in `js/baked_data.js`; festivals **not** baked (~7.7MB)
- **RFID / Cashless (Basic Scenario)** optional add-on (`rfid_model.json`, `js/rfid_addon.js`)
  - Checkbox in UI; editable qty table; ASSUMPTION default heuristics
  - Additive to live forecast opex only; Master Budget G3 / reconcile unchanged when off
  - `node scripts/verify_rfid.js` — sample subtotal at N=7888 defaults: **$29,792.70**
- **Safety / Weather** optional add-on (`rain_index.json`, `safety_weather_model.json`, `js/safety_weather.js`)
  - Checkbox toggle; outside Master Budget G3; UI disclaimer (not legal/safety plan; not NOAA)
  - Climatology rain_index 1–10 by state+month + city overrides; MC weather driver when outdoor/hybrid
  - `node scripts/verify_safety_weather.js` — default subtotal N=7888 outdoor camping 3 show days: **$259,553.33**

## How to open

```bash
cd /workspace/forecast_sim_event && python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

## Gaps / notes

- Default wizard (music focus on, camping on, marketing 16% of opex) **changes** live P&L vs raw sheet; use Reconcile button for baseline PASS table (wizard off, ancillaries unscaled).
- Directory dates are mostly 2017–2022 → nearly all matches show stale label (expected).
- Attendance populated on only ~2.7k of 26.8k rows → size_band often inactive.
- Old GitHub demo `pjrny/forecast_sim_event` intentionally **not** used (wrong ratio math).
- Iceland ROS under `reference/` is column inspiration only; blank pack does not copy artists.
- RFID Event Tech HTML-in-docx ignored; Basic Scenario PRICES row implemented as optional add-on (not WRSTBND proposal invention).
- ESA / safety sheets are **blank checklists** (titles only) — not a safety plan and not legal advice.
- No login / multi-app / SaaS.

## Paths created/updated

```
index.html                 (SheetJS CDN + blank pack button)
js/templates.js            (v1.1 multi-tab .xlsx builders)
js/app.js                  (enriched profile for pack download)
js/budget_engine.js
js/monte_carlo.js
js/competitor_score.js
js/competitors.js
js/poster.js
js/baked_data.js
js/rfid_addon.js
js/safety_weather.js
rfid_model.json
rain_index.json
safety_weather_model.json
scripts/verify_rfid.js
scripts/verify_safety_weather.js
scripts/verify_engine.js
festivals.json
competitor_score.js
README.md
BUILD_STATUS.md
```

Kept: `budget_model.json`, `reconcile.py`, `reconcile_report.md`, `reference/`.
