#!/usr/bin/env node
/** Node self-test: BudgetEngine at N=7888 vs sheet_targets_at_N0 within $1 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const sandbox = { console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/budget_engine.js"), "utf8"), sandbox);
const model = JSON.parse(fs.readFileSync(path.join(root, "budget_model.json"), "utf8"));
const report = sandbox.BudgetEngine.reconcileAtN0(model);
console.log("Festival Forecaster engine verify — N=" + report.N);
console.log("Result:", report.pass ? "PASS" : "FAIL");
for (const r of report.dollar) {
  console.log(
    (r.pass ? "PASS" : "FAIL"),
    r.label.padEnd(28),
    "sheet", r.sheet.toFixed(4),
    "model", r.model.toFixed(4),
    "Δ", r.delta.toFixed(4)
  );
}
process.exit(report.pass ? 0 : 1);
