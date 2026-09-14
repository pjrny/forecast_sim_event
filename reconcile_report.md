# Reconcile Report — N = 7888

Model: `/workspace/festival-forecaster/budget_model.json`
Tolerance: $1.00 absolute on dollar cells; $0.01 on per-ticket fee components.

## Comparison table

| cell | sheet | model | delta | status |
|------|------:|------:|------:|--------|
| C17 Site | 141,355.0000 | 141,355.0000 | 0.0000 | PASS |
| C48 Talent | 450,000.0000 | 450,000.0000 | 0.0000 | PASS |
| C49-C48 Production | 222,500.0000 | 222,500.0000 | 0.0000 | PASS |
| G34 Marketing | 81,900.0000 | 81,900.0000 | 0.0000 | PASS |
| C58 Ticketing | 61,397.8130 | 61,397.8130 | 0.0000 | PASS |
| C75 Staff | 111,000.0000 | 111,000.0000 | 0.0000 | PASS |
| C81 Annual ops | 27,013.7586 | 27,013.7586 | -0.0000 | PASS |
| G44+G58 Misc/guest | 115,500.0000 | 115,500.0000 | 0.0000 | PASS |
| G3 Total opex | 1,210,666.5720 | 1,210,666.5716 | -0.0004 | PASS |
| K2 Break-even ticket | 168.0930 | 168.0930 | -0.0000 | PASS |
| K22 Ticket revenue | 1,971,593.7680 | 1,971,593.7680 | 0.0000 | PASS |
| K24 Profit pre-ancillary | 760,927.1964 | 760,927.1964 | -0.0000 | PASS |
| K30 After addbacks | 815,927.1964 | 815,927.1964 | -0.0000 | PASS |
| K47 Full profit | 959,827.1964 | 959,827.1964 | -0.0000 | PASS |

## Break-even (B/F) components

| cell | sheet | model | delta | status |
|------|------:|------:|------:|--------|
| B17 | 16.270791 | 16.270791 | -0.000000 | PASS |
| B49 | 87.185091 | 87.185091 | -0.000000 | PASS |
| B58 | 0.315243 | 0.315243 | 0.000000 | PASS |
| B75 | 14.072008 | 14.072008 | 0.000000 | PASS |
| B81 | 1.003271 | 1.003271 | 0.000000 | PASS |
| F34 | 37.654513 | 37.654513 | 0.000000 | PASS |
| F44 | 5.850659 | 5.850659 | -0.000000 | PASS |
| F58 | 5.741379 | 5.741379 | 0.000000 | PASS |

## Department totals (model vs sheet)

| Site | model 141,355.00 | sheet 141,355.00 |
| Production (ex talent) | model 222,500.00 | sheet 222,500.00 |
| Talent | model 450,000.00 | sheet 450,000.00 |
| Marketing | model 81,900.00 | sheet 81,900.00 |
| Ticketing | model 61,397.81 | sheet 61,397.81 |
| Staff | model 111,000.00 | sheet 111,000.00 |
| Annual ops | model 27,013.76 | sheet 27,013.76 |
| Misc/guest (G44+G58) | model 115,500.00 | sheet 115,500.00 |
| Total opex G3 | model 1,210,666.57 | sheet 1,210,666.57 |

## ASSUMPTIONS

- N0 verified as K1=7888 on EXPENSES & TICKET SCENARIOS.
- data_only=True returned cached values for all key cells; no formula re-evaluation required for baseline reconcile.
- Budgeted cost (C/G) drives opex rollups. B/F 'Per Ticket Fee' drives break-even K2 and may be manually set independently of C/N0 (e.g. Site Portapotties B9=3 vs C9/N0≈2.23; Marketing Facebook F13=14 vs G13/N0≈3.17).
- Lines with Fixed?='x' or literal C/G amounts with no K1-dependent formula are typed fixed and do not scale with N.
- Venue C6 is hybrid: (N * B6) + (65 * 275) with B6=10.
- Ticketing CC fees C54 = 0.03 * K22 (pct of ticket+camping revenue), creating dependence of opex on revenue.
- Sales tax C80 = 0.10 * N * K2 * 0.15 per sheet formula B80*K1*K2*0.15.
- Marketing block = G6:G33 rollup G34 (header E5 'PR / Marketing / Advertising').
- Misc / guest experience rollup for reconcile = G44 (pre-production) + G58 (miscellaneous), per mission.
- Sheet F58=SUM(F47:F53) omits F54:F57 while G58=SUM(G47:G57); K2 uses F58 as written.
- Production model rollup = C49 - C48 (excludes talent); talent tracked separately as C48.
- Insurance C8 and several production/marketing lines lack Fixed? mark but are literal dollar amounts — treated as fixed.
- INCOME & GOALS tracks actuals; scenario P&L uses EXPENSES K-column simulator. Ancillaries K33:K45 and addbacks K27:K28 taken as fixed scenario amounts.
- K2 formula uses 100%-K8 style; modeled as (1 - p_camp).

## Result: PASS

