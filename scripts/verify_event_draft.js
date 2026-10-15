#!/usr/bin/env node
/**
 * event-draft.v1 verify:
 * 1) Default N=7888 draft (engine + skeleton ROS + MC) validates; Master Budget K22/G3 unchanged
 * 2) GA ticket name "GA – Pay at Door $199", price 0, max = capacity
 * 3) VIP omitted when absent; included (price 0, price in name) when tiers have VIP
 * 4) Lineup = act rows of confirmed ROS only; generated slot names → ''; typed names kept
 * 5) Capacity uses Limit Registrations when set
 * 6) validateEventDraft rejects missing venue / start>=end / capacity 0
 * 7) Forecast block marked d1_only and stripped by odooFields
 * 8) Ban filter: blocks doxx/drug how-to/minors/slur/real-name; curated bank all passes
 * 9) Mock Worker: anonymous /api/drafts → claim URL; signed-in drafts → create → dashboard_url
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, Math, Date };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
["js/ticket_tiers.js", "js/budget_engine.js", "js/monte_carlo.js", "js/ros_gate.js", "js/crowd_ban_filter.js", "js/crowd_bank.js", "js/event_draft.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox)
);
const { TicketTiers, BudgetEngine, MonteCarlo, RosGate, CrowdBanFilter, CrowdBank, EventDraft } = sandbox;
const model = JSON.parse(fs.readFileSync(path.join(root, "budget_model.json"), "utf8"));
const N0 = model.baseline.N0;
const T = model.sheet_targets_at_N0;

let failed = false;
function assert(c, m) { if (!c) { console.error("FAIL:", m); failed = true; } else console.log("PASS:", m); }

const profile = {
  name: "Sample Music Festival", start_date: "2026-11-13", end_date: "2026-11-15",
  start_time: "11:00", end_time: "23:30", timezone: "America/Chicago",
  venue_name: "Sample Grounds", street: "100 Festival Rd", city: "Houston", state: "TX", zip: "77002",
  type: "Music", subtype: "Camping", genre: "EDM", camping: true, cashless: "hybrid",
  N: N0, limit_registrations: null,
};

console.log("=== 1) Default N=" + N0 + " draft ===");
const budget = BudgetEngine.compute(model, { N: N0, scaleAncillaries: false, wizard: {}, rfid: { enabled: false }, safetyWeather: { enabled: false } });
assert(Math.abs(budget.K22 - T.K22) <= 1, "Master Budget K22 ≡ sheet at N0 (" + budget.K22.toFixed(2) + ")");
assert(Math.abs(budget.G3 - T.G3) <= 1, "Master Budget G3 ≡ sheet at N0 (" + budget.G3.toFixed(2) + ")");
const mc = MonteCarlo.run(model, { N: N0, scaleAncillaries: false, wizard: {} }, { draws: 300, seed: 42 });
const sk = RosGate.generateSkeleton({ start_date: profile.start_date, end_date: profile.end_date, camping: true, city: "Houston" });
const ros = { confirmed: true, rows: sk.rows };
const state = { profile, ga_price: model.defaults.ticket, tiers: { enabled: false, rows: [] }, ros, mc, budget, ledger: [{ label: "Baseline", active: true }] };
const d = EventDraft.buildEventDraft(state);
const v = EventDraft.validateEventDraft(d);
if (!v.ok) console.error(v.errors);
assert(v.ok, "default draft validates");
assert(d.version === "event-draft.v1" && d.start === "2026-11-13T11:00" && d.end === "2026-11-15T23:30", "version + local ISO start/end no offset");
assert(d.capacity === N0, "capacity = N when no limit (" + d.capacity + ")");
assert(JSON.stringify(d.tags) === JSON.stringify(["Music", "Camping", "EDM", "camping", "cashless:hybrid"]), "tags type/subtype/genre/camping/cashless");

console.log("=== 2) GA ticket ===");
assert(d.tickets[0].name === "GA – Pay at Door $199", "GA name '" + d.tickets[0].name + "'");
assert(d.tickets[0].price === 0 && d.tickets[0].max === N0, "GA price 0, max = capacity");

console.log("=== 3) VIP ===");
assert(d.tickets.length === 1, "VIP omitted when absent");
const dv = EventDraft.buildEventDraft(Object.assign({}, state, { tiers: { enabled: true, rows: [{ name: "GA", price: 199, qty: 7000 }, { name: "VIP", price: 349, qty: 888, max: 900 }] } }));
assert(dv.tickets.length === 2 && dv.tickets[1].name === "VIP – Pay at Door $349" && dv.tickets[1].price === 0 && dv.tickets[1].max === 900, "VIP present → '" + (dv.tickets[1] || {}).name + "' price 0");

console.log("=== 4) Lineup ===");
const actCount = sk.rows.filter((r) => ["first_set", "last_set"].includes(r.action)).length;
assert(d.lineup.length === actCount && actCount > 0, "lineup has only act rows (" + d.lineup.length + "/" + sk.rows.length + " ROS rows)");
assert(d.lineup.every((a) => a.name === ""), "auto-generated slots export name '' (no 'First set Day 1' placeholders)");
assert(d.lineup.every((a) => a.stage && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(a.start) && a.end > a.start), "unnamed slots keep start/end/stage");
const typed = sk.rows.map((r) => (r.action === "first_set" && r.day === 1 ? Object.assign({}, r, { note: "DJ Sunrise" }) : r));
const dt = EventDraft.buildEventDraft(Object.assign({}, state, { ros: { confirmed: true, rows: typed } }));
assert(dt.lineup.filter((a) => a.name === "DJ Sunrise").length === 1 && dt.lineup.filter((a) => a.name === "").length === actCount - 1, "organizer-typed name kept; other slots stay ''");
assert(d.lineup[0].start === "2026-11-13T12:00" && d.lineup[0].end === "2026-11-13T13:00", "act start/end on correct show day");
const withArtist = EventDraft.buildEventDraft(Object.assign({}, state, { ros: { confirmed: true, rows: sk.rows.concat([{ day: 2, time: "21:00", end_time: "22:30", artist: "Headliner X", area: "Main Stage", action: "set" }]) } }));
assert(withArtist.lineup.some((a) => a.name === "Headliner X" && a.stage === "Main Stage" && a.end === "2026-11-14T22:30"), "artist row → name/stage/end");
assert(EventDraft.buildEventDraft(Object.assign({}, state, { ros: { confirmed: false, rows: sk.rows } })).lineup.length === 0, "unconfirmed ROS → empty lineup");

console.log("=== 5) Limit Registrations ===");
const dl = EventDraft.buildEventDraft(Object.assign({}, state, { profile: Object.assign({}, profile, { limit_registrations: 5000 }) }));
assert(dl.capacity === 5000 && dl.tickets[0].max === 5000, "capacity + GA max use limit (5000)");

console.log("=== 6) Validation rejects ===");
const bad1 = EventDraft.validateEventDraft(EventDraft.buildEventDraft(Object.assign({}, state, { profile: Object.assign({}, profile, { zip: "", street: "" }) })));
assert(!bad1.ok && bad1.errors.includes("venue.zip required") && bad1.errors.includes("venue.street required"), "missing venue street/zip rejected");
const bad2 = EventDraft.validateEventDraft(EventDraft.buildEventDraft(Object.assign({}, state, { profile: Object.assign({}, profile, { end_date: "2026-11-13", end_time: "10:00" }) })));
assert(!bad2.ok && bad2.errors.includes("start must be before end"), "start >= end rejected");
const bad3 = EventDraft.validateEventDraft(EventDraft.buildEventDraft(Object.assign({}, state, { profile: Object.assign({}, profile, { N: 0 }) })));
assert(!bad3.ok && bad3.errors.includes("capacity must be > 0"), "capacity 0 rejected");

console.log("=== 7) Forecast D1-only ===");
assert(d.forecast._storage === "d1_only" && d.forecast.p50 === mc.P50 && d.forecast.p_profit === mc.pProfit && Math.abs(d.forecast.break_even_ticket - T.K2) <= 0.01, "forecast p10/p50/p90/p_profit/break_even present, d1_only");
assert(!("forecast" in EventDraft.odooFields(d)), "odooFields strips forecast");

console.log("=== 8) Ban filter ===");
const blocked = ["text me 713-555-1212", "dm a@b.com", "how to sneak molly in past security", "hope he ODs lol", "she lives at 123 Main St", "some teen got nude", "you retard", "Saw Jane Doe at stage", "take 200mg mdma"];
blocked.forEach((l) => assert(!CrowdBanFilter.isAllowed(l, { realNames: ["Jane Doe"] }), "blocks: " + l));
const bank = CrowdBank.GENERAL.concat(CrowdBank.HEALTH_PROTOCOL);
assert(bank.every((l) => CrowdBanFilter.isAllowed(CrowdBank.fillTemplate(l, {}))), "all " + bank.length + " curated lines pass shared filter");
const mixed = CrowdBank.acceptGenerated(["call 713-555-1212"], 2, (() => { let i = 0; return () => (i++ * 0.37) % 1; })(), {}, {});
assert(mixed.length === 2 && mixed.every((l) => CrowdBanFilter.isAllowed(l)), "blocked generated lines fall back to curated bank");

console.log("=== 9) Mock Worker round trip ===");
(async () => {
  const { start } = require("./mock_worker.js");
  const CE = require("../js/create_event.js");
  const w = await start(0);
  try {
    let opened = null;
    const r1 = await CE.createFreeEvent(d, { WORKER_BASE: w.url }, { fetch, open: (u) => (opened = u) });
    assert(r1.mode === "anonymous" && /\/claim\?draft=drf_\w+&t=\w+/.test(opened), "anon POST /api/drafts → window.open claim URL");
    const claim = await fetch(opened);
    assert(claim.status === 200, "claim URL accepted by mock (200)");
    const bad = await fetch(w.url + "/claim?draft=" + r1.draft_id + "&t=nope");
    assert(bad.status === 403, "wrong claim token → 403");
    let redirected = null;
    const authFetch = (u, o) => fetch(u, Object.assign({}, o, { headers: Object.assign({}, o.headers, { "x-mock-session": "1" }) }));
    const r2 = await CE.createFreeEvent(d, { WORKER_BASE: w.url, SAME_ORIGIN_SIGNED_IN: true }, { fetch: authFetch, redirect: (u) => (redirected = u) });
    assert(r2.mode === "signed_in" && redirected === "/organizer/events/" + r2.odoo_event_id, "signed-in drafts → create → redirect dashboard_url");
    const ev = w.store.events[0];
    assert(ev && !("forecast" in ev.odoo) && ev.d1_forecast && ev.odoo.tickets.every((t) => t.price === 0), "mock Odoo payload has no forecast; tickets $0");
    let rejected = false;
    try { await CE.createFreeEvent(Object.assign({}, d, { venue: {} }), { WORKER_BASE: w.url }, { fetch, open: () => {} }); } catch (e) { rejected = e.status === 422; }
    assert(rejected, "invalid draft → 422 from Worker");
    const unauth = await fetch(w.url + "/api/organizer/drafts", { method: "POST", body: "{}" });
    assert(unauth.status === 401, "organizer endpoints require auth (401)");
  } finally {
    w.server.close();
  }
  console.log(failed ? "\nverify_event_draft: FAIL" : "\nverify_event_draft: ALL PASS");
  process.exit(failed ? 1 : 0);
})();
