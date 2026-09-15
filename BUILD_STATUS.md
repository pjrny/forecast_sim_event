# Festival Forecaster v1.3 — BUILD_STATUS

**Date:** 2026-09-15  
**Status:** **v1.3 PASS** — Accuracy then UX (branch `v1.3-accuracy-ux`)

## What works

- Deterministic P&L from `budget_model.json` (`js/budget_engine.js` core math unchanged)
- **Ticket tiers** (`js/ticket_tiers.js`) — default reconstruct K22 from K7/K6/K8; qty≠N blocks MC; max/window → MC only
- **Limit Registrations** — caps wizard N and MC attendance draws; off = no change
- **Sponsors / Booths** (`js/sponsors_booths.js`) — off ⇒ G3/K47 unchanged; on ⇒ income + optional site cost outside G3
- **Assumption ledger** + **Reset to sheet N=7888**
- Marketing slider labeled **ASSUMPTION / not G6:G33**
- AX stepper (Profile → Tickets → Prep → ROS → Numbers → Competitors → Pack)
- Sticky KPIs K22/G3/K24/K47; yellow live≠sheet banner
- Pack: blank `.xlsx` + **`odoo_event_import.csv`**
- RFID / SafetyWeather outside G3 when OFF; ROS gate still required before MC

## TEST PLAN results

| Check | Result |
|-------|--------|
| verify_engine PASS | **PASS** |
| verify_rfid PASS | **PASS** |
| verify_safety_weather PASS | **PASS** |
| verify_tiers PASS | **PASS** |
| Reconcile N=7888 PASS all addons OFF | **PASS** |
| Default tiers reconstruct K22 | **PASS** (1971593.768 ≡ sheet) |
| Limit Registrations caps MC | **PASS** (max N=5000 when capped) |
| Sponsors off ⇒ K47 unchanged | **PASS** |
| ROS still blocks Run | **PASS** (unchanged gate) |
| Reset-to-sheet restores raw KPIs | **PASS** (baselineMode + empty wizard) |
| Pack downloads include CSV | **PASS** (`buildOdooEventImportCsv` / `downloadAll`) |

## How to open

```bash
cd /workspace/forecast_sim_event && python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

## Paths created/updated (v1.3)

```
js/ticket_tiers.js          (new)
js/sponsors_booths.js       (new)
scripts/verify_tiers.js     (new)
js/budget_engine.js         (sponsors additive only — core math untouched)
js/monte_carlo.js           (limit + tier max/window ASSUMPTION)
js/templates.js             (odoo_event_import.csv)
js/app.js                   (tiers, sponsors, ledger, AX stepper)
index.html                  (AX stepper chrome)
css/app.css                 (stepper + sticky KPIs)
README.md
BUILD_STATUS.md
```

## K22 default match

At N=7888, default tiers (K14/K19 all-in × K8 mix): **1971593.768** ≡ `sheet_targets_at_N0.K22`.
