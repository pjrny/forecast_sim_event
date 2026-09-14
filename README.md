# Festival Forecaster v1 — Lineup Insurance Pack

Deterministic P&L from Oscar’s **Tool Music + Camping Festival Master Budgeting Tool**, Monte Carlo bands, competitor matches from the festival listing directory, SVG poster, blank ops templates, and optional RFID/POS add-on from **Tool Basic Scenario Calculator**.

**Not** the old ratio-hack demo (see `archived_demo/`).

## Run locally

```bash
python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

`festivals.json` (~8MB, 26,780 festivals) is loaded via `fetch` — a static HTTP server is required (not `file://`).

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

`[Input] → [Deterministic P&L] → [Monte Carlo + Competitors] → [Pack: poster + blank templates]`

## Branch

`v1-lineup-insurance-pack` — do not merge to `main` until reviewed.
