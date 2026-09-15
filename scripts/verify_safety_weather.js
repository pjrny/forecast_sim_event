#!/usr/bin/env node
/**
 * Safety / Weather add-on verify:
 * 1) Reconcile N=7888 still PASS with add-on off (G3/K24/K47 untouched)
 * 2) With add-on on at N=7888 outdoor camping 3 show days defaults, subtotal > 0
 * 3) rain_index lookup sample (TX August, Houston)
 * 4) Master G3 unchanged when ON; live total_opex = G3 + SW
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const rainIndex = JSON.parse(fs.readFileSync(path.join(root, "rain_index.json"), "utf8"));
const swModel = JSON.parse(fs.readFileSync(path.join(root, "safety_weather_model.json"), "utf8"));
sandbox.RAIN_INDEX = rainIndex;
sandbox.window.RAIN_INDEX = rainIndex;
sandbox.SAFETY_WEATHER_MODEL = swModel;
sandbox.window.SAFETY_WEATHER_MODEL = swModel;

// RFID model optional (engine may reference)
try {
  const rfidModel = JSON.parse(fs.readFileSync(path.join(root, "rfid_model.json"), "utf8"));
  sandbox.RFID_MODEL = rfidModel;
  sandbox.window.RFID_MODEL = rfidModel;
} catch (e) {}

vm.runInContext(fs.readFileSync(path.join(root, "js/safety_weather.js"), "utf8"), sandbox);
try {
  vm.runInContext(fs.readFileSync(path.join(root, "js/rfid_addon.js"), "utf8"), sandbox);
} catch (e) {}
vm.runInContext(fs.readFileSync(path.join(root, "js/budget_engine.js"), "utf8"), sandbox);

const model = JSON.parse(fs.readFileSync(path.join(root, "budget_model.json"), "utf8"));
const targets = model.sheet_targets_at_N0;
const tol = 1.0;
function near(a, b) {
  return Math.abs(a - b) <= tol;
}

console.log("=== rain_index sample ===");
const txAug = sandbox.SafetyWeather.lookupRainIndex({ state: "TX", month: 8 });
const houstonAug = sandbox.SafetyWeather.lookupRainIndex({
  state: "TX",
  city: "Houston",
  month: 8,
});
console.log("TX August:", txAug);
console.log("Houston August:", houstonAug);
if (!txAug || txAug.index == null) {
  console.error("FAIL: TX August rain_index missing");
  process.exit(1);
}
if (!houstonAug || houstonAug.index == null || houstonAug.source.indexOf("city_override") !== 0) {
  console.error("FAIL: Houston August city override missing");
  process.exit(1);
}
console.log("rain_index OK");

console.log("\n=== 1) Reconcile with Safety/Weather OFF ===");
const report = sandbox.BudgetEngine.reconcileAtN0(model);
console.log("Reconcile N=" + report.N + ":", report.pass ? "PASS" : "FAIL");
if (!report.pass) {
  for (const r of report.dollar) {
    if (!r.pass) console.log("  FAIL", r.label, "Δ", r.delta);
  }
  process.exit(1);
}

const off = sandbox.BudgetEngine.compute(model, {
  N: 7888,
  scaleAncillaries: false,
  wizard: {},
  rfid: { enabled: false },
  safetyWeather: { enabled: false },
});
if (!near(off.G3, targets.G3) || !near(off.K24, targets.K24) || !near(off.K47, targets.K47)) {
  console.error("FAIL: Safety/Weather off still changed G3/K24/K47", {
    G3: off.G3,
    K24: off.K24,
    K47: off.K47,
  });
  process.exit(1);
}
if (off.safety_weather_subtotal !== 0) {
  console.error("FAIL: safety_weather_subtotal should be 0 when off");
  process.exit(1);
}
console.log("Safety/Weather OFF: G3/K24/K47 unchanged vs sheet_targets — OK");

console.log("\n=== 2) Safety/Weather ON at N=7888 outdoor camping 3 show days ===");
const swOpts = {
  enabled: true,
  venue_mode: "outdoor",
  peak_occupancy: 7888,
  show_days: 3,
  load_in_days: 2,
  camping: true,
  cancellation_reserve_pct: 5,
  weather_service_budget: 2500,
  qtyOverrides: {},
};

const est = sandbox.SafetyWeather.computeSafetyWeatherEstimate({
  ...swOpts,
  N: 7888,
  master_opex: targets.G3,
});
console.log("Subtotal:", est.subtotal.toFixed(2));
if (!(est.subtotal > 0)) {
  console.error("FAIL: subtotal must be > 0");
  process.exit(1);
}
for (const line of est.lines) {
  console.log(
    line.id.padEnd(26),
    "qty",
    String(line.qty).padStart(6),
    "@",
    String(line.unit_price).padStart(10),
    "=",
    line.extended.toFixed(2),
    "[" + line.category + "]"
  );
}

const on = sandbox.BudgetEngine.compute(model, {
  N: 7888,
  scaleAncillaries: false,
  wizard: { camping: "on" },
  rfid: { enabled: false },
  safetyWeather: swOpts,
});
if (!near(on.G3, on.G3_master)) {
  console.error("FAIL: G3 must equal G3_master");
  process.exit(1);
}
// Master G3 with camping wizard will differ from sheet — that's expected.
// Assert G3 itself is NOT inflated by safety subtotal:
if (Math.abs(on.total_opex - (on.G3 + est.subtotal)) > 1.0) {
  // Recompute est with actual G3 (camping changes master opex → cancel reserve)
  const est2 = sandbox.SafetyWeather.computeSafetyWeatherEstimate({
    ...swOpts,
    N: 7888,
    master_opex: on.G3,
  });
  if (!near(on.total_opex, on.G3 + est2.subtotal)) {
    console.error("FAIL: total_opex live ≠ G3 + Safety/Weather", on.total_opex, on.G3 + est2.subtotal);
    process.exit(1);
  }
  console.log("Master G3 (unchanged by SW bake-in):", on.G3.toFixed(2));
  console.log("Live total opex (G3+SW):", on.total_opex.toFixed(2));
  console.log("SW subtotal (vs live G3):", est2.subtotal.toFixed(2));
} else {
  console.log("Master G3 (unchanged by SW bake-in):", on.G3.toFixed(2));
  console.log("Live total opex (G3+SW):", on.total_opex.toFixed(2));
}

// Baseline reconcile path: sheet G3 with camping off / no wizard
const onBase = sandbox.BudgetEngine.compute(model, {
  N: 7888,
  scaleAncillaries: false,
  wizard: {},
  rfid: { enabled: false },
  safetyWeather: {
    enabled: true,
    venue_mode: "outdoor",
    peak_occupancy: 7888,
    show_days: 3,
    load_in_days: 2,
    camping: true, // camping flag on SW profile (overnight security)
    cancellation_reserve_pct: 5,
    weather_service_budget: 2500,
  },
});
if (!near(onBase.G3, targets.G3)) {
  console.error("FAIL: cells/G3 master must stay sheet G3 when SW on (no wizard); got", onBase.G3);
  process.exit(1);
}
const estBase = sandbox.SafetyWeather.computeSafetyWeatherEstimate({
  enabled: true,
  N: 7888,
  peak_occupancy: 7888,
  show_days: 3,
  load_in_days: 2,
  camping: true,
  venue_mode: "outdoor",
  cancellation_reserve_pct: 5,
  weather_service_budget: 2500,
  master_opex: targets.G3,
});
if (!near(onBase.total_opex, targets.G3 + estBase.subtotal)) {
  console.error(
    "FAIL: total_opex ≠ G3 + SW",
    onBase.total_opex,
    targets.G3 + estBase.subtotal
  );
  process.exit(1);
}
if (!near(onBase.K24, onBase.K22 - onBase.total_opex)) {
  console.error("FAIL: K24 live math");
  process.exit(1);
}

console.log("\nDefault safety subtotal at N=7888 outdoor camping 3 show days: $" + estBase.subtotal.toFixed(2));
console.log("\nResult: PASS");
process.exit(0);
