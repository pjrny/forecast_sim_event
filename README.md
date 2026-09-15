# Festival Forecaster v1.3 — Accuracy then UX

Deterministic P&L from Oscar’s **Tool Music + Camping Festival Master Budgeting Tool**, Monte Carlo bands with a **patron-journey presentation** (ROS gate + OPS/CROWD feeds), competitor matches, SVG poster, blank ops `.xlsx` pack, **`odoo_event_import.csv`**, optional RFID/POS + Safety/Weather + **Sponsors/Booths**, and **Odoo-style ticket tiers** that default-reconstruct sheet **K22**.

**Not** the old ratio-hack demo (see `archived_demo/`).

## Run locally

```bash
python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

`festivals.json` (~8MB) loads via `fetch` — static HTTP server required. SheetJS CDN for workbooks.

## AX stepper (Attendee Patron Journey)

1. **Profile** — event card, N, optional Limit Registrations  
2. **Tickets** — K7/K6/K8 + optional tier table + live K22  
3. **Prep** — wizard modifiers, accordion RFID / Safety-Weather / Sponsors, assumption ledger  
4. **ROS** — Confirm required before MC  
5. **Numbers + journey** — P10/P50/P90 first, then rail/OPS/CROWD  
6. **Competitors + debrief** — stale badge: *month-day; listing year may be stale*  
7. **Pack** — poster, blank `.xlsx`, `odoo_event_import.csv`

Sticky header KPIs: **K22 · G3 · K24 · K47**. Yellow banner when live ≠ raw sheet. **Reset to sheet N=7888** restores raw KPIs (wizard/addons off).

## Ticket tiers → K22

Default reconstruct (camping mix unchanged):

- **GA Camper** price = K14 = `ticket + camp_fee + 0.03*(ticket+camp_fee) + 3`, qty = `N × K8`  
- **GA Non-camper** price = K19 = `ticket + 0.03*ticket + 1`, qty = `N × (1−K8)`  
- `Σ(qty×price) ≡ sheet K22`

Optional camp-separate: `Σ(qty×price) + camp_fee×N×p_camp`. If tiers ON and qty sum ≠ N → error, MC blocked. **Max + sales window** affect MC attendance shocks only (ASSUMPTION).

## Verify

```bash
node scripts/verify_engine.js
node scripts/verify_rfid.js
node scripts/verify_safety_weather.js
node scripts/verify_tiers.js
```

RFID / Safety-Weather / Sponsors **off** leave Master Budget G3/K47 unchanged. Marketing slider is labeled **ASSUMPTION / not G6:G33**.

## Branch

`v1.3-accuracy-ux`
