#!/usr/bin/env node
/**
 * Ticket tiers verify:
 * 1) Default reconstruct K22 ≡ sheet at N=7888
 * 2) qty sum ≠ N → error
 * 3) Engine reconcile still PASS with tiers OFF
 * 4) camp_separate path documented math
 * 5) MC constraints: max / short window (ASSUMPTION helpers only)
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(root, "js/ticket_tiers.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/budget_engine.js"), "utf8"), sandbox);

const model = JSON.parse(fs.readFileSync(path.join(root, "budget_model.json"), "utf8"));
const targets = model.sheet_targets_at_N0;
const N0 = model.baseline.N0;
const tol = 1.0;
function near(a, b) {
  return Math.abs(a - b) <= tol;
}

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed = true;
  } else {
    console.log("PASS:", msg);
  }
}

console.log("=== 1) Default tiers reconstruct K22 at N=" + N0 + " ===");
const tiers = sandbox.TicketTiers.defaultTiersFromSheet(model.defaults, N0);
const rev = sandbox.TicketTiers.computeTierRevenue(tiers, {
  enabled: true,
  N: N0,
  camp_separate: false,
});
console.log("  qtySum", rev.qtySum, "N", N0);
console.log("  revenue", rev.revenue, "sheet K22", targets.K22);
assert(!rev.error, "default tiers qty sum == N");
assert(near(rev.revenue, targets.K22), "default reconstruct revenue ≡ sheet K22");

const withBuild = sandbox.BudgetEngine.compute(model, {
  N: N0,
  scaleAncillaries: false,
  wizard: {},
  ticketBuild: rev.ticketBuild,
  rfid: { enabled: false },
  safetyWeather: { enabled: false },
});
assert(near(withBuild.K22, targets.K22), "engine ticketBuild path K22 ≡ sheet");
assert(near(withBuild.G3, targets.G3), "engine G3 unchanged with default tier ticketBuild");

console.log("\n=== 2) qty sum ≠ N → error ===");
const bad = sandbox.TicketTiers.computeTierRevenue(
  [{ name: "VIP", price: 399, expected_qty: 100, max: 100 }],
  { enabled: true, N: N0 }
);
assert(!!bad.error, "mismatch qty triggers error: " + bad.error);

console.log("\n=== 3) Tiers OFF — reconcile PASS ===");
const report = sandbox.BudgetEngine.reconcileAtN0(model);
assert(report.pass, "reconcileAtN0 PASS with tiers unused");

const off = sandbox.TicketTiers.computeTierRevenue(tiers, { enabled: false, N: N0 });
assert(off.ticketBuild == null && off.revenue == null, "tiers OFF returns null ticketBuild");

console.log("\n=== 4) camp_separate adds camp_fee×N×p_camp ===");
const faceOnly = [
  {
    name: "GA",
    price: model.defaults.ticket,
    expected_qty: N0,
    max: N0,
  },
];
const sep = sandbox.TicketTiers.computeTierRevenue(faceOnly, {
  enabled: true,
  N: N0,
  camp_separate: true,
  camp_fee: model.defaults.camp_fee,
  p_camp: model.defaults.p_camp,
});
const expectCamp = model.defaults.camp_fee * N0 * model.defaults.p_camp;
assert(near(sep.campAddon, expectCamp), "campAddon = camp_fee×N×p_camp");
assert(near(sep.revenue, model.defaults.ticket * N0 + expectCamp), "face + camp separate revenue");

console.log("\n=== 5) Limit registrations + MC constraints ===");
assert(
  sandbox.TicketTiers.applyLimitRegistrations(9000, 5000) === 5000,
  "limit caps N"
);
assert(
  sandbox.TicketTiers.applyLimitRegistrations(4000, 5000) === 4000,
  "limit below N unchanged"
);
assert(
  sandbox.TicketTiers.applyLimitRegistrations(4000, 0) === 4000,
  "limit off = no change"
);

const constrained = sandbox.TicketTiers.mcAttendanceConstraints(
  [
    {
      name: "GA",
      price: 199,
      expected_qty: 1000,
      max: 1200,
      sales_start: "2026-06-01",
      sales_end: "2026-06-07",
    },
  ],
  1000
);
assert(constrained.maxAttendance === 1200, "maxAttendance from tier max");
assert(constrained.walkUpVarianceBoost === 1, "short window → walkUp boost 1");

const longWin = sandbox.TicketTiers.mcAttendanceConstraints(
  [
    {
      name: "GA",
      price: 199,
      expected_qty: 1000,
      max: 1200,
      sales_start: "2026-01-01",
      sales_end: "2026-06-01",
    },
  ],
  1000
);
assert(longWin.walkUpVarianceBoost < 1, "longer window → lower walkUp boost");

console.log("\nResult:", failed ? "FAIL" : "PASS");
process.exit(failed ? 1 : 0);
