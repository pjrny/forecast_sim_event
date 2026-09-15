# Festival Forecaster v1.2 — Lineup Insurance Pack + MC Journey

Deterministic P&L from Oscar’s **Tool Music + Camping Festival Master Budgeting Tool**, Monte Carlo bands with a **patron-journey presentation** (ROS gate + OPS/CROWD feeds), competitor matches from the festival listing directory, SVG poster, **multi-tab blank ops `.xlsx` templates** (SheetJS), and optional RFID/POS + Safety/Weather add-ons.

**Not** the old ratio-hack demo (see `archived_demo/`).

## Run locally

```bash
python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

`festivals.json` (~8MB, 26,780 festivals) is loaded via `fetch` — a static HTTP server is required (not `file://`). SheetJS loads from CDN for workbook downloads.

## Phase 2 — Monte Carlo journey

1. **ROS gate:** Choose *Use my ROS* (editable time|area|action|owner) or *Generate skeleton*. Required cues: gates, first_set, doors, peak, last_set, egress (+ `camp_open` when Camping on). Click **Confirm ROS**.
2. **Run 5,000 draws** stays **disabled** until ROS is confirmed. Presets still only change shock width.
3. After compute, **numbers show first** (P10/P50/P90, P(profit>0), tornado), then a **20–40s** compressed journey animates one representative draw (default P50).
4. LEFT journey rail + CENTER OPS (radio log) + CROWD (`@anon####` ≤140 chars from curated `js/crowd_bank.js`). Ratio ~1 OPS : 2 CROWD.
5. Optional **Health-protocol intensity** toggle (default OFF) unlocks ESA COVID specifics (6ft, 100.4F, 14-day isolation) in feeds. Weather/crush/ingress/toilets/medical/production hygiene always available for OPS.
6. After egress: debrief (3 stages) + **Replay P10|P50|P90** + Download pack.

No confession / EDM spreadsheet ingest — crowd lines are an original curated bank only.

## Blank pack (v1.1)

**Download blank pack (.xlsx)** stamps the wizard profile on every sheet and ships empty data rows. Workbooks: Talent, Artists marketing, Lineup announce, Go-to-market, ROS, Area hours, Load-in, Transport, RFID/POS, Safety pack.

## Reconcile (Master Budget)

```bash
node scripts/verify_engine.js
```

Must PASS at **N = 7888** within $1 of sheet targets (G3, K2, K22, K24, K30, K47, department rollups).

```bash
node scripts/verify_rfid.js
node scripts/verify_safety_weather.js
```

RFID / Safety-Weather add-ons off leave Master Budget totals unchanged.

## Product flow

`[Input] → [Deterministic P&L] → [ROS Confirm → Monte Carlo journey + Competitors] → [Pack: poster + blank .xlsx templates]`

## Branch

`v1.2-mc-journey-presentation` — do not merge to `main` until reviewed.
