#!/usr/bin/env node
/**
 * RFID add-on verify:
 * 1) Reconcile N=7888 still PASS with add-on off
 * 2) With add-on on at N=7888 defaults, print subtotal and assert > 0 and lines match unit_price*qty
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const rfidModel = JSON.parse(fs.readFileSync(path.join(root, "rfid_model.json"), "utf8"));
sandbox.RFID_MODEL = rfidModel;
sandbox.window.RFID_MODEL = rfidModel;

vm.runInContext(fs.readFileSync(path.join(root, "js/rfid_addon.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/budget_engine.js"), "utf8"), sandbox);

const model = JSON.parse(fs.readFileSync(path.join(root, "budget_model.json"), "utf8"));

console.log("=== 1) Reconcile with RFID OFF ===");
const report = sandbox.BudgetEngine.reconcileAtN0(model);
console.log("Reconcile N=" + report.N + ":", report.pass ? "PASS" : "FAIL");
if (!report.pass) {
  for (const r of report.dollar) {
    if (!r.pass) console.log("  FAIL", r.label, "Δ", r.delta);
  }
  process.exit(1);
}

// Explicit off path on live compute
const off = sandbox.BudgetEngine.compute(model, {
  N: 7888,
  scaleAncillaries: false,
  wizard: {},
  rfid: { enabled: false },
});
const targets = model.sheet_targets_at_N0;
const tol = 1.0;
function near(a, b) {
  return Math.abs(a - b) <= tol;
}
if (!near(off.G3, targets.G3) || !near(off.K24, targets.K24) || !near(off.K47, targets.K47)) {
  console.error("FAIL: RFID off still changed G3/K24/K47", {
    G3: off.G3,
    K24: off.K24,
    K47: off.K47,
  });
  process.exit(1);
}
if (off.rfid_subtotal !== 0) {
  console.error("FAIL: rfid_subtotal should be 0 when off");
  process.exit(1);
}
console.log("RFID OFF: G3/K24/K47 unchanged vs sheet_targets — OK");

console.log("\n=== 2) RFID ON at N=7888 default qtys ===");
const est = sandbox.RfidAddon.computeRfidEstimate({ N: 7888, enabled: true, qtyOverrides: {} });
console.log("Subtotal:", est.subtotal.toFixed(2));
if (!(est.subtotal > 0)) {
  console.error("FAIL: subtotal must be > 0");
  process.exit(1);
}
let linesOk = true;
for (const line of est.lines) {
  const expect = Math.round(line.unit_price * line.qty * 100) / 100;
  const ok = Math.abs(line.extended - expect) < 0.001;
  console.log(
    (ok ? "OK" : "BAD"),
    line.id.padEnd(22),
    "qty",
    String(line.qty).padStart(6),
    "@",
    String(line.unit_price).padStart(7),
    "=",
    line.extended.toFixed(2)
  );
  if (!ok) linesOk = false;
}
if (!linesOk) {
  console.error("FAIL: line extended ≠ unit_price*qty");
  process.exit(1);
}

const on = sandbox.BudgetEngine.compute(model, {
  N: 7888,
  scaleAncillaries: false,
  wizard: {},
  rfid: { enabled: true },
});
if (!near(on.G3, targets.G3)) {
  console.error("FAIL: cells/G3 master must stay sheet G3 when RFID on; got", on.G3);
  process.exit(1);
}
if (!near(on.total_opex, targets.G3 + est.subtotal)) {
  console.error("FAIL: total_opex live ≠ G3 + RFID", on.total_opex, targets.G3 + est.subtotal);
  process.exit(1);
}
if (!near(on.K24, on.K22 - on.total_opex)) {
  console.error("FAIL: K24 live math");
  process.exit(1);
}
console.log("Master G3 (unchanged):", on.G3.toFixed(2));
console.log("Live total opex (G3+RFID):", on.total_opex.toFixed(2));
console.log("Live K24:", on.K24.toFixed(2));
console.log("Consumer pass-through (not opex):", est.consumer_passthrough);

console.log("\nResult: PASS");
console.log("Sample estimate subtotal at N=7888 (default qtys): $" + est.subtotal.toFixed(2));
process.exit(0);
