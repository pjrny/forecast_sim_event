# Festival Forecaster v1.1 — Lineup Insurance Pack

Deterministic P&L from Oscar’s **Tool Music + Camping Festival Master Budgeting Tool**, Monte Carlo bands, competitor matches from the festival listing directory, SVG poster, **multi-tab blank ops `.xlsx` templates** (SheetJS), and optional RFID/POS add-on from **Tool Basic Scenario Calculator**.

**Not** the old ratio-hack demo (see `archived_demo/`).

## Run locally

```bash
python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

`festivals.json` (~8MB, 26,780 festivals) is loaded via `fetch` — a static HTTP server is required (not `file://`). SheetJS loads from CDN for workbook downloads.

## Blank pack (v1.1)

**Download blank pack (.xlsx)** stamps the wizard profile on every sheet (festival, dates, city/state, type/subtype/genre, N, camping, budget/talent cap if present) and ships empty data rows. Workbooks: Talent, Artists marketing, Lineup announce, Go-to-market, ROS, Area hours, Load-in, Transport, RFID/POS, Safety pack. No artist/staff/vendor secrets from reference sources; ACT columns stay blank unless the user typed talent names (Cover only).

## Reconcile (Master Budget)

```bash
node scripts/verify_engine.js
```

Must PASS at **N = 7888** within $1 of sheet targets (G3, K2, K22, K24, K30, K47, department rollups).

RFID add-on off leaves Master Budget totals unchanged:

```bash
node scripts/verify_rfid.js
```

## Product flow

`[Input] → [Deterministic P&L] → [Monte Carlo + Competitors] → [Pack: poster + blank .xlsx templates]`

## Branch

`v1.1-templates-weather-safety` — do not merge to `main` until reviewed.
