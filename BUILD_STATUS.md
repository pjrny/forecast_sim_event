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


---

# v1.4 — event-draft.v1 / Create this event

Branch `v1.4-event-draft` (based on local `v1.3-accuracy-ux` tip b2ee6f6).

| Check | Result |
|---|---|
| Wizard: venue name, street, city, state, ZIP, timezone (IANA select, default America/Chicago), start/end time, genre | **DONE** |
| `buildEventDraft` / `validateEventDraft` / `odooFields` | **PASS** (`verify_event_draft.js`) |
| Default N=7888 draft validates; K22/G3 ≡ sheet | **PASS** |
| GA `GA – Pay at Door $199`, price 0, max = capacity | **PASS** |
| VIP omitted when absent / included when tier exists | **PASS** |
| Lineup = act rows of confirmed ROS only | **PASS** (6 of 16 skeleton rows) |
| Capacity uses Limit Registrations | **PASS** |
| Ban filter blocks doxx/drug how-to/minors/OD wishes/slur/real names; 70 curated lines pass | **PASS** |
| Mock Worker: anon draft → claim URL; signed-in → create → dashboard_url; 401/403/422 paths | **PASS** |
| Browser smoke (headless Chrome + mock Worker): button disabled until valid, enables after fill+ROS confirm, claim tab opened, no cookies, autosave restores after reload | **PASS** |
| Existing verify_engine / rfid / safety_weather / tiers + reconcile.py | **PASS** (Master Budget N=7888 unchanged) |

## Gaps
- `docs/event-draft.v1.local.json` is a placeholder until the organizer repo publishes the canonical schema.
- Real Worker endpoints aren't live yet, so the flow has only been tested against `scripts/mock_worker.js`.
- Skeleton ROS act rows are generic ("First set Day 1"). Artist names only appear if the organizer edits them in.
- Festival directory → D1 and R2-backed generation are on the Worker side and not part of this repo.

## Paths (v1.4)
```
js/event_draft.js            (new)
js/create_event.js           (new)
js/crowd_ban_filter.js       (new)
js/crowd_bank.js             (uses shared filter; acceptGenerated)
js/app.js                    (venue fields, autosave/restore, Create buttons)
index.html                   (wizard fields, step-7 Create box)
docs/event-draft.v1.local.json (new, placeholder)
scripts/mock_worker.js       (new)
scripts/verify_event_draft.js (new)
```
