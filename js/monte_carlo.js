/**
 * Monte Carlo risk band — 5000 draws, deterministic shocks around base P&L.
 */
(function (global) {
  "use strict";

  const PRESETS = {
    conservative: { label: "Conservative", attnLo: -0.25, attnHi: 0.05 },
    base: { label: "Base", attnLo: -0.15, attnHi: 0.1 },
    aggressive: { label: "Aggressive", attnLo: -0.08, attnHi: 0.18 },
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Triangular on [lo, hi] with mode at 0 (relative shock), mapped to [1+lo, 1+hi]. */
  function triangular01(rng, lo, hi) {
    // mode at 0 within [lo,hi]
    const a = lo;
    const b = hi;
    const c = 0;
    const u = rng();
    const fc = (c - a) / (b - a);
    let x;
    if (u < fc) {
      x = a + Math.sqrt(u * (b - a) * (c - a));
    } else {
      x = b - Math.sqrt((1 - u) * (b - a) * (b - c));
    }
    return 1 + x;
  }

  function lognormalRightSkew(rng, sigma) {
    // Box-Muller then exp; mean of underlying ~0 so E[exp] = exp(sig^2/2)
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const raw = Math.exp(sigma * z);
    // normalize so median ≈ 1
    return raw / Math.exp(0); // median of lognormal(0,σ) is 1
  }

  function betaSample(rng, a, b) {
    // Gamma via Marsaglia for shape>=1, else boost
    function gamma(shape) {
      if (shape < 1) {
        return gamma(shape + 1) * Math.pow(rng(), 1 / shape);
      }
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do {
          const u1 = Math.max(rng(), 1e-12);
          const u2 = rng();
          x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = rng();
        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    }
    const x = gamma(a);
    const y = gamma(b);
    return x / (x + y);
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const i = (sorted.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
  }

  /**
   * Run MC around a base scenario.
   * shocks: attendance triangular, avg ticket, talent lognormal, production,
   * sponsor beta, camp mix, on-site spend.
   */
  function run(model, baseOptions, opts) {
    opts = opts || {};
    const draws = opts.draws || 5000;
    const presetName = opts.preset || "base";
    const preset = PRESETS[presetName] || PRESETS.base;
    const rng = mulberry32(opts.seed != null ? opts.seed : 42);
    const engine = global.BudgetEngine;

    const base = engine.compute(model, baseOptions);
    const nets = [];
    const coverTickets = []; // K22 > opex?
    const profits = [];

    // Tornado: one-at-a-time high/low on key drivers
    const tornadoDrivers = [];

    for (let i = 0; i < draws; i++) {
      const attnMult = triangular01(rng, preset.attnLo, preset.attnHi);
      const ticketMult = 1 + (rng() - 0.5) * 0.16; // ±8% avg ticket
      const talentMult = lognormalRightSkew(rng, 0.22); // right-skew cost risk
      const prodMult = 0.9 + rng() * 0.25; // 0.9–1.15
      const sponsorFrac = betaSample(rng, 2, 5); // sponsor realization 0–1-ish, mean ~0.29
      const campMix = Math.min(0.99, Math.max(0.05, base.p_camp + (rng() - 0.5) * 0.2));
      const onsiteMult = 0.7 + rng() * 0.6; // 0.7–1.3 on-site / ancillaries

      const N = Math.max(1, Math.round(base.N * attnMult));
      const ticket = base.ticket * ticketMult;

      const r = engine.compute(model, {
        ...baseOptions,
        N,
        ticket,
        p_camp: campMix,
        scaleAncillaries: true,
        wizard: (baseOptions && baseOptions.wizard) || {},
        ancillaryOverrides: scaleAncs(base, onsiteMult, sponsorFrac),
      });

      // Apply talent/production shocks on top of computed departments by adjusting net
      // Recompute with modified talent/production via wizard-like overrides:
      const talentShock = r.departments.talent * (talentMult - 1);
      const prodShock = r.departments.production * (prodMult - 1);
      const net = r.K47 - talentShock - prodShock;
      const opexAdj = r.total_opex + talentShock + prodShock;
      const ticketsCover = r.K22 > opexAdj;

      nets.push(net);
      profits.push(net > 0 ? 1 : 0);
      coverTickets.push(ticketsCover ? 1 : 0);
    }

    nets.sort((a, b) => a - b);
    const P10 = percentile(nets, 0.1);
    const P50 = percentile(nets, 0.5);
    const P90 = percentile(nets, 0.9);
    const pProfit = profits.reduce((a, b) => a + b, 0) / draws;
    const pCover = coverTickets.reduce((a, b) => a + b, 0) / draws;

    // Tornado sensitivity (deterministic ± shocks on base)
    const tornado = buildTornado(engine, model, baseOptions, base, preset);

    const sentence = plainSentence({
      P10,
      P50,
      P90,
      pProfit,
      pCover,
      preset: preset.label,
      baseNet: base.K47,
    });

    return {
      draws,
      preset: presetName,
      presetLabel: preset.label,
      P10,
      P50,
      P90,
      pProfit,
      pCover,
      tornado,
      sentence,
      baseNet: base.K47,
    };
  }

  function scaleAncs(base, onsiteMult, sponsorFrac) {
    const out = {};
    (base.ancillaries || []).forEach((a) => {
      if (a.id === "sponsorship_dollars") {
        out[a.id] = a.amount * sponsorFrac * 3.2; // beta mean ~0.29 → ~0.93× baseline stretch
      } else {
        out[a.id] = a.amount * onsiteMult;
      }
    });
    return out;
  }

  function buildTornado(engine, model, baseOptions, base, preset) {
    const drivers = [
      {
        name: "Attendance",
        low: () =>
          engine.compute(model, {
            ...baseOptions,
            N: Math.round(base.N * (1 + preset.attnLo)),
          }).K47,
        high: () =>
          engine.compute(model, {
            ...baseOptions,
            N: Math.round(base.N * (1 + preset.attnHi)),
          }).K47,
      },
      {
        name: "Avg ticket",
        low: () =>
          engine.compute(model, { ...baseOptions, ticket: base.ticket * 0.92 }).K47,
        high: () =>
          engine.compute(model, { ...baseOptions, ticket: base.ticket * 1.08 }).K47,
      },
      {
        name: "Talent cost",
        low: () =>
          engine.compute(model, {
            ...baseOptions,
            wizard: { ...(baseOptions.wizard || {}), musicFocus: "no" },
          }).K47,
        high: () =>
          engine.compute(model, {
            ...baseOptions,
            wizard: { ...(baseOptions.wizard || {}), musicFocus: "yes" },
          }).K47,
      },
      {
        name: "Camp mix",
        low: () =>
          engine.compute(model, {
            ...baseOptions,
            p_camp: Math.max(0.05, base.p_camp - 0.15),
          }).K47,
        high: () =>
          engine.compute(model, {
            ...baseOptions,
            p_camp: Math.min(0.99, base.p_camp + 0.1),
          }).K47,
      },
      {
        name: "On-site / ancillaries",
        low: () => {
          const o = {};
          base.ancillaries.forEach((a) => (o[a.id] = a.amount * 0.7));
          return engine.compute(model, {
            ...baseOptions,
            ancillaryOverrides: o,
            scaleAncillaries: false,
          }).K47;
        },
        high: () => {
          const o = {};
          base.ancillaries.forEach((a) => (o[a.id] = a.amount * 1.3));
          return engine.compute(model, {
            ...baseOptions,
            ancillaryOverrides: o,
            scaleAncillaries: false,
          }).K47;
        },
      },
    ];

    return drivers
      .map((d) => {
        const lo = d.low();
        const hi = d.high();
        return {
          name: d.name,
          low: lo,
          high: hi,
          swing: Math.abs(hi - lo),
        };
      })
      .sort((a, b) => b.swing - a.swing);
  }

  function plainSentence(s) {
    const fmt = (n) =>
      (n < 0 ? "-" : "") +
      "$" +
      Math.abs(Math.round(n)).toLocaleString("en-US");
    const pct = (p) => Math.round(p * 100) + "%";
    return (
      "Under the " +
      s.preset +
      " attendance band, median full profit (K47) is " +
      fmt(s.P50) +
      " (P10 " +
      fmt(s.P10) +
      " · P90 " +
      fmt(s.P90) +
      "), with " +
      pct(s.pProfit) +
      " of draws profitable and " +
      pct(s.pCover) +
      " where ticket revenue covers opex."
    );
  }

  global.MonteCarlo = { run, PRESETS };
})(typeof window !== "undefined" ? window : global);
