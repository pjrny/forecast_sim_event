#!/usr/bin/env python3
"""Reconcile budget_model.json against sheet targets at N=N0."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "budget_model.json"
TOL = 1.00  # dollars


def line_cost(line: dict, N: float, *, revenue: float | None = None, k2: float | None = None) -> float:
    t = line["type"]
    if t == "fixed":
        return float(line["amount"] or 0.0)
    if t == "per_ticket":
        return float(line["rate"] or 0.0) * N
    if t == "hybrid":
        h = line["hybrid"]
        return float(h["per_ticket_rate"]) * N + float(h["fixed_addend"])
    if t == "pct_of_revenue":
        if revenue is None:
            raise ValueError(f"pct_of_revenue line {line['id']} needs revenue")
        return float(line["rate"]) * revenue
    if t == "sales_tax":
        if k2 is None:
            raise ValueError("sales_tax needs k2")
        # B80 * N * K2 * 0.15 with B80=0.10
        return float(line["rate"]) * N * k2 * 0.15
    raise ValueError(f"unknown type {t} for {line.get('id')}")


def dept_be_rate(dept: dict) -> float:
    """Sum of be_rate on lines. For misc, sheet F58 only sums F47:F53."""
    lines = dept["lines"]
    if dept["id"] == "misc":
        # Match sheet F58=SUM(F47:F53): first 7 misc lines (Golf Carts .. EMS)
        # Rows 47-53 inclusive = 7 lines; remaining rows 54-57 excluded from F
        return sum(float(l.get("be_rate") or 0.0) for l in lines[:7])
    return sum(float(l.get("be_rate") or 0.0) for l in lines)


def compute(model: dict, N: float | None = None) -> dict:
    N = float(model["baseline"]["N0"] if N is None else N)
    d = model["defaults"]
    ticket = float(d["ticket"])
    camp_fee = float(d["camp_fee"])
    p_camp = float(d["p_camp"])
    svc = float(d["service_fee_rate"])
    camp_proc = float(d["camper_processing"])
    non_proc = float(d["noncamper_processing"])

    P_camper = ticket + camp_fee + svc * (ticket + camp_fee) + camp_proc
    P_noncamper = ticket + svc * ticket + non_proc
    R_tickets = N * p_camp * P_camper + N * (1.0 - p_camp) * P_noncamper

    depts = {dep["id"]: dep for dep in model["departments"]}

    # Break-even K2 from be_rates (independent of N for manually set rates;
    # for C/N-derived rates, be_rate is stored at baseline — correct at N0)
    be = {
        "site": dept_be_rate(depts["site"]),
        "production_incl_talent": dept_be_rate(depts["production"]) + dept_be_rate(depts["talent"]),
        "ticketing": dept_be_rate(depts["ticketing"]),
        "staff": dept_be_rate(depts["staff"]),
        "annual_ops": dept_be_rate(depts["annual_ops"]),
        "marketing": dept_be_rate(depts["marketing"]),
        "pre_production": dept_be_rate(depts["pre_production"]),
        "misc": dept_be_rate(depts["misc"]),
    }
    # Sheet: K2 = F34+F44+F58+B81+B75+B58+B49+B17
    K2 = (
        be["marketing"]
        + be["pre_production"]
        + be["misc"]
        + be["annual_ops"]
        + be["staff"]
        + be["ticketing"]
        + be["production_incl_talent"]
        + be["site"]
    )

    def sum_dept(dept_id: str, **kw) -> float:
        return sum(line_cost(l, N, **kw) for l in depts[dept_id]["lines"])

    # Pass 1: costs that don't need K2 (sales tax needs K2; CC needs revenue)
    site = sum_dept("site", revenue=R_tickets, k2=K2)
    production = sum_dept("production", revenue=R_tickets, k2=K2)
    talent = sum_dept("talent", revenue=R_tickets, k2=K2)
    marketing = sum_dept("marketing", revenue=R_tickets, k2=K2)
    pre_production = sum_dept("pre_production", revenue=R_tickets, k2=K2)
    misc = sum_dept("misc", revenue=R_tickets, k2=K2)
    ticketing = sum_dept("ticketing", revenue=R_tickets, k2=K2)
    staff = sum_dept("staff", revenue=R_tickets, k2=K2)
    annual_ops = sum_dept("annual_ops", revenue=R_tickets, k2=K2)

    production_incl_talent = production + talent
    misc_guest = pre_production + misc
    total_opex = (
        site
        + production_incl_talent
        + ticketing
        + staff
        + annual_ops
        + marketing
        + pre_production
        + misc
    )

    anc = sum(float(a["amount"]) for a in model["ancillaries"])
    kickback = next(a["amount"] for a in model["addbacks"] if a["id"] == "ticket_kickback")
    owner = next(a["amount"] for a in model["addbacks"] if a["id"] == "owner_salary_addback")

    K24 = R_tickets - total_opex
    K30 = K24 + kickback + owner
    K47 = K24 + anc + kickback + owner

    return {
        "N": N,
        "P_camper": P_camper,
        "P_noncamper": P_noncamper,
        "K2": K2,
        "K22": R_tickets,
        "C17_site": site,
        "C48_talent": talent,
        "C49_prod_incl": production_incl_talent,
        "production_ex_talent": production,
        "G34_marketing": marketing,
        "C58_ticketing": ticketing,
        "C75_staff": staff,
        "C81_annual_ops": annual_ops,
        "G44_preprod": pre_production,
        "G58_misc": misc,
        "misc_guest_exp": misc_guest,
        "G3_total_opex": total_opex,
        "K24": K24,
        "K30": K30,
        "K47": K47,
        "be": be,
    }


def main() -> int:
    model = json.loads(MODEL_PATH.read_text())
    targets = model["sheet_targets_at_N0"]
    m = compute(model)

    # Comparison rows: (label, sheet_key or None, model_value)
    rows = [
        ("C17 Site", targets["C17"], m["C17_site"]),
        ("C48 Talent", targets["C48"], m["C48_talent"]),
        ("C49-C48 Production", targets["production_ex_talent"], m["production_ex_talent"]),
        ("G34 Marketing", targets["G34"], m["G34_marketing"]),
        ("C58 Ticketing", targets["C58"], m["C58_ticketing"]),
        ("C75 Staff", targets["C75"], m["C75_staff"]),
        ("C81 Annual ops", targets["C81"], m["C81_annual_ops"]),
        ("G44+G58 Misc/guest", targets["misc_guest_exp"], m["misc_guest_exp"]),
        ("G3 Total opex", targets["G3"], m["G3_total_opex"]),
        ("K2 Break-even ticket", targets["K2"], m["K2"]),
        ("K22 Ticket revenue", targets["K22"], m["K22"]),
        ("K24 Profit pre-ancillary", targets["K24"], m["K24"]),
        ("K30 After addbacks", targets["K30"], m["K30"]),
        ("K47 Full profit", targets["K47"], m["K47"]),
    ]

    # Also verify BE component rollups
    be_rows = [
        ("B17", targets["B17"], m["be"]["site"]),
        ("B49", targets["B49"], m["be"]["production_incl_talent"]),
        ("B58", targets["B58"], m["be"]["ticketing"]),
        ("B75", targets["B75"], m["be"]["staff"]),
        ("B81", targets["B81"], m["be"]["annual_ops"]),
        ("F34", targets["F34"], m["be"]["marketing"]),
        ("F44", targets["F44"], m["be"]["pre_production"]),
        ("F58", targets["F58"], m["be"]["misc"]),
    ]

    print(f"{'cell':<28} {'sheet':>14} {'model':>14} {'delta':>12}")
    print("-" * 70)
    failures = []
    for label, sheet_v, model_v in rows:
        delta = model_v - sheet_v
        ok = abs(delta) <= TOL
        flag = "OK" if ok else "FAIL"
        print(f"{label:<28} {sheet_v:14.4f} {model_v:14.4f} {delta:12.4f}  {flag}")
        if not ok:
            failures.append((label, sheet_v, model_v, delta))

    print("\nBreak-even component check:")
    print(f"{'cell':<28} {'sheet':>14} {'model':>14} {'delta':>12}")
    print("-" * 70)
    for label, sheet_v, model_v in be_rows:
        delta = model_v - sheet_v
        ok = abs(delta) <= 0.01  # rates: tighter
        flag = "OK" if ok else "FAIL"
        print(f"{label:<28} {sheet_v:14.6f} {model_v:14.6f} {delta:12.6f}  {flag}")
        if not ok:
            failures.append((label, sheet_v, model_v, delta))

    report_lines = [
        "# Reconcile Report — N = 7888",
        "",
        f"Model: `{MODEL_PATH}`",
        f"Tolerance: ${TOL:.2f} absolute on dollar cells; $0.01 on per-ticket fee components.",
        "",
        "## Comparison table",
        "",
        "| cell | sheet | model | delta | status |",
        "|------|------:|------:|------:|--------|",
    ]
    all_ok = True
    for label, sheet_v, model_v in rows:
        delta = model_v - sheet_v
        ok = abs(delta) <= TOL
        all_ok = all_ok and ok
        report_lines.append(
            f"| {label} | {sheet_v:,.4f} | {model_v:,.4f} | {delta:,.4f} | {'PASS' if ok else 'FAIL'} |"
        )

    report_lines += [
        "",
        "## Break-even (B/F) components",
        "",
        "| cell | sheet | model | delta | status |",
        "|------|------:|------:|------:|--------|",
    ]
    for label, sheet_v, model_v in be_rows:
        delta = model_v - sheet_v
        ok = abs(delta) <= 0.01
        all_ok = all_ok and ok
        report_lines.append(
            f"| {label} | {sheet_v:.6f} | {model_v:.6f} | {delta:.6f} | {'PASS' if ok else 'FAIL'} |"
        )

    report_lines += [
        "",
        "## Department totals (model vs sheet)",
        "",
        f"| Site | model {m['C17_site']:,.2f} | sheet {targets['C17']:,.2f} |",
        f"| Production (ex talent) | model {m['production_ex_talent']:,.2f} | sheet {targets['production_ex_talent']:,.2f} |",
        f"| Talent | model {m['C48_talent']:,.2f} | sheet {targets['C48']:,.2f} |",
        f"| Marketing | model {m['G34_marketing']:,.2f} | sheet {targets['G34']:,.2f} |",
        f"| Ticketing | model {m['C58_ticketing']:,.2f} | sheet {targets['C58']:,.2f} |",
        f"| Staff | model {m['C75_staff']:,.2f} | sheet {targets['C75']:,.2f} |",
        f"| Annual ops | model {m['C81_annual_ops']:,.2f} | sheet {targets['C81']:,.2f} |",
        f"| Misc/guest (G44+G58) | model {m['misc_guest_exp']:,.2f} | sheet {targets['misc_guest_exp']:,.2f} |",
        f"| Total opex G3 | model {m['G3_total_opex']:,.2f} | sheet {targets['G3']:,.2f} |",
        "",
        "## ASSUMPTIONS",
        "",
    ]
    for a in model.get("assumptions", []):
        report_lines.append(f"- {a}")

    report_lines += [
        "",
        f"## Result: {'PASS' if all_ok else 'FAIL'}",
        "",
    ]
    if failures:
        report_lines.append("### Failures")
        for label, sheet_v, model_v, delta in failures:
            report_lines.append(
                f"- **{label}**: sheet={sheet_v:.4f} model={model_v:.4f} delta={delta:.4f}"
            )

    (ROOT / "reconcile_report.md").write_text("\n".join(report_lines) + "\n")

    if failures:
        print("\nFAILURES:")
        for label, sheet_v, model_v, delta in failures:
            print(f"  {label}: sheet={sheet_v} model={model_v} delta={delta}")
        return 1
    print("\nALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
