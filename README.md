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
node scripts/verify_event_draft.js   # event-draft.v1 + ban filter + mock Worker round trip
```

RFID / Safety-Weather / Sponsors **off** leave Master Budget G3/K47 unchanged. Marketing slider is labeled **ASSUMPTION / not G6:G33**.

## Create this event (event-draft.v1)

At the end of the flow (step 7) there are two buttons:

- **Create free event (pay at door)**: enabled only when the ROS is confirmed and the draft passes `validateEventDraft()` (name, start < end, IANA timezone, venue name/street/city/state/ZIP, capacity > 0). Missing items are listed under the button.
- **Create paid event**: links to `https://www.pjrny.com/#Contact-us`.

`js/event_draft.js` → `buildEventDraft(state)` produces:

| Field | Source | Odoo |
|---|---|---|
| `name`, `start`/`end` (local `YYYY-MM-DDTHH:mm`, no offset), `timezone` | wizard profile (+ start/end time) | `name`, `date_begin`/`date_end`, `date_tz` |
| `venue{name,street,city,state,zip}` | wizard | address partner |
| `capacity` | Limit Registrations if set, else N | `seats_max` |
| `tags` | type, subtype, genre, camping, cashless mode | `tag_ids` |
| `tickets` | `GA – Pay at Door $<GA price>` price 0, max = capacity; `VIP – Pay at Door $<price>` only if a VIP tier exists | event tickets ($0) |
| `lineup[{name,start,end,stage}]` | **act rows only** of the confirmed ROS (`first_set`/`last_set`/`set`/`act`/`headliner`, `kind:"act"` or `artist`) | tracks (`name` is `''` for auto-generated slots like "First set Day 1"; only organizer-typed names are sent) |
| `forecast{p10,p50,p90,p_profit,break_even_ticket,pnl_by_dept,assumption_ledger}` | MC + engine + ledger | **D1 only, never Odoo** (`odooFields()` strips it) |

Placeholder schema: `docs/event-draft.v1.local.json`, to be replaced by the organizer repo's canonical `event-draft.v1.json`.

**Transport** (`js/create_event.js`, no cookies):

```js
window.FORECASTER_CONFIG = {
  WORKER_BASE: "https://<organizer worker>",   // default "" = same origin
  SAME_ORIGIN_SIGNED_IN: false,                 // true when served as the Worker's Simulate tab
  PAID_EVENT_URL: "https://www.pjrny.com/#Contact-us",
};
```

- Signed out (embed on www.pjrny.com): `POST {WORKER_BASE}/api/drafts` → `{draft_id, claim_token}`, then `window.open({WORKER_BASE}/claim?draft=…&t=…)`.
- Signed in (same origin): `POST /api/organizer/drafts` → `{draft_id}`, then `POST /api/organizer/drafts/:id/create` → `{odoo_event_id, dashboard_url, public_url}` and redirect to `dashboard_url`.
- Inputs autosave to localStorage (`festival_forecaster_v1_draft`) and restore on load, so signed-out users keep their work.

**Mock Worker** for local testing: `node scripts/mock_worker.js 8787` (implements all of the above; validates drafts, forces $0 tickets, stores forecast separately).

## Crowd feed ban filter

`js/crowd_ban_filter.js` is a pure UMD module shared with the organizer Worker: `check(line, {realNames})` → `{ok, reasons}`. Categories: real_name (hook list), minors_sexual, sexual, drug_howto, assault_od, doxxing (phones, emails, street addresses, SSN-like, @handles), slur. `CrowdBank.filterBanned` applies it to the curated bank, and `CrowdBank.acceptGenerated(lines, …)` keeps only passing Worker-generated lines and tops up from the curated bank.

## Branch

`v1.4-event-draft` (from `v1.3-accuracy-ux`)
