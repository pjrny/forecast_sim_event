/**
 * Festival Forecaster v1 — Lineup Insurance Pack UI
 * localStorage drafts only; baked JSON; no login.
 */
(function () {
  "use strict";

  const LS_KEY = "festival_forecaster_v1_draft";
  let model = null;
  let festivals = [];
  let lastPnL = null;
  let lastMC = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function fmtMoney(n) {
    const v = Number(n) || 0;
    const sign = v < 0 ? "-" : "";
    return sign + "$" + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function fmtMoney2(n) {
    const v = Number(n) || 0;
    const sign = v < 0 ? "-" : "";
    return (
      sign +
      "$" +
      Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }
  function fmtNum(n, d) {
    return Number(n).toLocaleString("en-US", {
      maximumFractionDigits: d != null ? d : 2,
    });
  }

  function readForm() {
    const marketingPct = Number($("#marketingPct").value);
    return {
      profile: {
        name: $("#festName").value.trim(),
        start_date: $("#startDate").value,
        end_date: $("#endDate").value,
        city: $("#city").value.trim(),
        state: $("#state").value.trim(),
        type: $("#festType").value.trim(),
        subtype: $("#festSubtype").value.trim(),
        camping: $("#campingOn").checked,
        N: Number($("#attendance").value) || 0,
      },
      options: {
        N: Number($("#attendance").value) || model.baseline.N0,
        ticket: Number($("#ticketPrice").value),
        camp_fee: Number($("#campFee").value),
        p_camp: Number($("#pCamp").value) / 100,
        scaleAncillaries: $("#scaleAncillaries").checked,
        wizard: {
          musicFocus: $("#musicFocus").checked ? "yes" : "no",
          experienceFocus: $("#experienceFocus").checked ? "yes" : false,
          camping: $("#campingOn").checked ? "on" : false,
          lastMinuteProduction: $("#lastMinute").checked,
          marketingPct: marketingPct,
          marketingHardCap: $("#marketingCap").value
            ? Number($("#marketingCap").value)
            : null,
        },
      },
      mcPreset: $("#mcPreset").value,
      rfid: {
        enabled: !!($("#rfidEnabled") && $("#rfidEnabled").checked),
        cashlessMode: $("#cashlessMode") ? $("#cashlessMode").value : "hybrid",
        qtyOverrides: readRfidQtyOverrides(),
      },
    };
  }

  function readRfidQtyOverrides() {
    // Only user-edited qtys (not every rendered default) so N changes refresh ASSUMPTION heuristics
    return Object.assign({}, window.__rfidQtyOverrides || {});
  }

  function setRfidQtyOverride(id, value) {
    if (!window.__rfidQtyOverrides) window.__rfidQtyOverrides = {};
    const v = Number(value);
    if (Number.isFinite(v) && v >= 0) window.__rfidQtyOverrides[id] = v;
  }

  function applyDefaultsToForm() {
    const d = model.defaults;
    const N0 = model.baseline.N0;
    $("#attendance").value = N0;
    $("#ticketPrice").value = d.ticket;
    $("#campFee").value = d.camp_fee;
    $("#pCamp").value = Math.round(d.p_camp * 100);
    $("#marketingPct").value = 16;
    $("#marketingPctLabel").textContent = "16%";
    $("#scaleAncillaries").checked = true;
    $("#musicFocus").checked = true;
    $("#campingOn").checked = true;
    $("#experienceFocus").checked = false;
    $("#lastMinute").checked = false;
    $("#festName").value = "Sample Music Festival";
    $("#festType").value = "Music";
    $("#festSubtype").value = "Camping";
    $("#city").value = "";
    $("#state").value = "";
    if ($("#rfidEnabled")) $("#rfidEnabled").checked = false;
    if ($("#cashlessMode")) $("#cashlessMode").value = "hybrid";
    if ($("#rfidQtyPanel")) $("#rfidQtyPanel").hidden = true;
  }

  function saveDraft() {
    const data = readForm();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      flash("Draft saved locally.");
    } catch (e) {
      flash("Could not save draft: " + e.message, "warn");
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        flash("No draft found.", "info");
        return;
      }
      const data = JSON.parse(raw);
      const p = data.profile || {};
      const o = data.options || {};
      const w = o.wizard || {};
      if (p.name != null) $("#festName").value = p.name;
      if (p.start_date) $("#startDate").value = p.start_date;
      if (p.end_date) $("#endDate").value = p.end_date;
      if (p.city != null) $("#city").value = p.city;
      if (p.state != null) $("#state").value = p.state;
      if (p.type != null) $("#festType").value = p.type;
      if (p.subtype != null) $("#festSubtype").value = p.subtype;
      if (o.N) $("#attendance").value = o.N;
      if (o.ticket) $("#ticketPrice").value = o.ticket;
      if (o.camp_fee != null) $("#campFee").value = o.camp_fee;
      if (o.p_camp != null) $("#pCamp").value = Math.round(o.p_camp * 100);
      if (typeof o.scaleAncillaries === "boolean")
        $("#scaleAncillaries").checked = o.scaleAncillaries;
      $("#musicFocus").checked = w.musicFocus === "yes" || w.musicFocus === true;
      $("#experienceFocus").checked = !!w.experienceFocus && w.experienceFocus !== false;
      $("#campingOn").checked = w.camping === "on" || w.camping === true || p.camping;
      $("#lastMinute").checked = !!w.lastMinuteProduction;
      if (w.marketingPct != null) {
        $("#marketingPct").value = w.marketingPct;
        $("#marketingPctLabel").textContent = w.marketingPct + "%";
      }
      if (w.marketingHardCap != null) $("#marketingCap").value = w.marketingHardCap;
      if (data.mcPreset) $("#mcPreset").value = data.mcPreset;
      if (data.rfid) {
        if ($("#rfidEnabled")) $("#rfidEnabled").checked = !!data.rfid.enabled;
        if ($("#cashlessMode") && data.rfid.cashlessMode)
          $("#cashlessMode").value = data.rfid.cashlessMode;
        window.__rfidQtyOverrides = data.rfid.qtyOverrides || {};
      }
      flash("Draft loaded.", "info");
      recalculate();
    } catch (e) {
      flash("Draft load failed: " + e.message, "warn");
    }
  }

  function flash(msg, kind) {
    const el = $("#flash");
    el.className = "banner " + (kind || "info");
    el.textContent = msg;
    el.hidden = false;
  }

  function tip(cell, desc) {
    return (
      '<span class="tooltip-cell cell-ref" title="' +
      cell +
      (desc ? ": " + desc : "") +
      '">' +
      cell +
      "</span>"
    );
  }

  function renderPnL(r) {
    lastPnL = r;
    const setKpi = (id, val, money) => {
      const el = $(id);
      el.textContent = money ? fmtMoney(val) : fmtNum(val);
      el.classList.remove("pos", "neg");
      if (money) el.classList.add(val >= 0 ? "pos" : "neg");
    };
    setKpi("#kpiRevenue", r.K22, true);
    setKpi("#kpiOpex", r.total_opex != null ? r.total_opex : r.G3, true);
    setKpi("#kpiK24", r.K24, true);
    setKpi("#kpiK47", r.K47, true);

    const rows = [
      ["Site", r.departments.site, "C17"],
      ["Production (ex talent)", r.departments.production, "C49−C48"],
      ["Talent / Lineup", r.departments.talent, "C48"],
      ["Marketing", r.departments.marketing, "G34"],
      ["Ticketing", r.departments.ticketing, "C58"],
      ["Staff", r.departments.staff, "C75"],
      ["Annual ops", r.departments.annual_ops, "C81"],
      ["Pre-production", r.departments.pre_production, "G44"],
      ["Misc / guest exp", r.departments.misc, "G58"],
    ];

    let html = "<table class='pnl'><thead><tr><th>Bucket</th><th></th><th class='num'>Amount</th></tr></thead><tbody>";
    rows.forEach(([label, val, cell]) => {
      html +=
        "<tr><td>" +
        label +
        "</td><td class='cell' title='" +
        cell +
        "'>" +
        cell +
        "</td><td class='num'>" +
        fmtMoney2(val) +
        "</td></tr>";
    });
    html +=
      "<tr class='total'><td>Master Budget total opex</td><td class='cell'>G3</td><td class='num'>" +
      fmtMoney2(r.G3) +
      "</td></tr>";
    if (r.rfid_enabled && r.rfid) {
      html +=
        "<tr class='addon-row'><td>RFID / Cashless (Basic Scenario) <span class='cell-ref' title='Optional add-on — not Master Budget'>add-on</span></td><td class='cell'>RFID</td><td class='num'>" +
        fmtMoney2(r.rfid_subtotal) +
        "</td></tr>";
      html +=
        "<tr class='total addon-row'><td>Total opex (live = G3 + RFID)</td><td class='cell'>live</td><td class='num'>" +
        fmtMoney2(r.total_opex) +
        "</td></tr>";
      html +=
        "<tr class='sub'><td colspan='3' style='font-size:0.78rem'>RFID is additive to Master Budget for the live forecast only. Unit prices from Basic Scenario Calculator PRICES — not Master Budget.</td></tr>";
    }
    html +=
      "<tr><td>Ticket + camp revenue</td><td class='cell'>K22</td><td class='num'>" +
      fmtMoney2(r.K22) +
      "</td></tr>";
    html +=
      "<tr><td>Break-even ticket</td><td class='cell'>K2</td><td class='num'>" +
      fmtMoney2(r.K2) +
      "</td></tr>";
    html +=
      "<tr><td>Profit pre-ancillary</td><td class='cell'>K24</td><td class='num'>" +
      fmtMoney2(r.K24) +
      "</td></tr>";
    html +=
      "<tr class='sub'><td>+ Kickback (K27)</td><td class='cell'>K27</td><td class='num'>" +
      fmtMoney2(r.kickback) +
      "</td></tr>";
    html +=
      "<tr class='sub'><td>+ Owner addback (K28)</td><td class='cell'>K28</td><td class='num'>" +
      fmtMoney2(r.owner) +
      "</td></tr>";
    html +=
      "<tr><td>After addbacks</td><td class='cell'>K30</td><td class='num'>" +
      fmtMoney2(r.K30) +
      "</td></tr>";
    html +=
      "<tr class='sub'><td>+ Ancillaries</td><td class='cell'>K33:K45</td><td class='num'>" +
      fmtMoney2(r.ancTotal) +
      "</td></tr>";
    html +=
      "<tr class='total'><td>Full profit</td><td class='cell'>K47</td><td class='num'>" +
      fmtMoney2(r.K47) +
      "</td></tr>";
    html += "</tbody></table>";

    if (r.marketingPct != null) {
      html +=
        "<p class='banner info' style='margin-top:0.75rem'>Marketing slider " +
        r.marketingPct +
        "% → required spend " +
        fmtMoney2(r.marketingRequired) +
        (r.marketingHardCap != null
          ? " · hard cap " + fmtMoney2(r.marketingHardCap)
          : " · no hard cap") +
        ". Cap does not invent revenue.</p>";
      if (r.marketingNote) {
        html += "<p class='banner warn'>" + r.marketingNote + "</p>";
      }
    }

    if (r.warnings && r.warnings.length) {
      r.warnings.forEach((w) => {
        html += "<p class='banner warn'>" + w + "</p>";
      });
    }

    html += "<details class='anc'><summary>Ancillaries detail (" + r.ancillaries.length + ")</summary><table class='pnl'><tbody>";
    r.ancillaries.forEach((a) => {
      html +=
        "<tr><td>" +
        a.label +
        "</td><td class='cell'>" +
        a.cell +
        "</td><td class='num'>" +
        fmtMoney2(a.amount) +
        "</td></tr>";
    });
    html += "</tbody></table></details>";

    $("#pnlTable").innerHTML = html;

    // Profile N for poster/competitors
    const { profile } = readForm();
    profile.N = r.N;
  }

  function recalculate() {
    if (!model) return;
    const form = readForm();
    const options = form.options;
    const profile = form.profile;
    options.rfid = form.rfid;
    // Merge draft overrides if qty inputs not yet rendered
    if (
      form.rfid.enabled &&
      Object.keys(form.rfid.qtyOverrides || {}).length === 0 &&
      window.__rfidQtyOverrides
    ) {
      options.rfid.qtyOverrides = window.__rfidQtyOverrides;
    }
    const r = BudgetEngine.compute(model, options);
    renderRfidPanel(r);
    renderPnL(r);
    renderCompetitors(profile, r);
  }

  function renderRfidPanel(r) {
    const enabled = $("#rfidEnabled") && $("#rfidEnabled").checked;
    const panel = $("#rfidQtyPanel");
    if (!panel) return;
    panel.hidden = !enabled;
    if (!enabled) {
      $("#rfidSubtotal").textContent = fmtMoney2(0);
      return;
    }
    // Prefer engine result; else compute locally for table
    let est = r && r.rfid;
    if (!est || !est.enabled) {
      const N = Number($("#attendance").value) || (model && model.baseline.N0) || 0;
      const overrides = Object.assign(
        {},
        window.__rfidQtyOverrides || {},
        readRfidQtyOverrides()
      );
      est = RfidAddon.computeRfidEstimate({ N: N, enabled: true, qtyOverrides: overrides });
    }
    const body = $("#rfidQtyBody");
    const prevFocus = document.activeElement && document.activeElement.classList.contains("rfid-qty-input")
      ? document.activeElement.dataset.id
      : null;
    const prevSel =
      document.activeElement && document.activeElement.classList.contains("rfid-qty-input")
        ? [document.activeElement.selectionStart, document.activeElement.selectionEnd]
        : null;

    let html = "";
    (est.lines || []).forEach(function (line) {
      html +=
        "<tr class='rfid-row'><td>" +
        escapeHtml(line.label) +
        "<div class='muted-label'>" +
        escapeHtml(line.unit || "") +
        (line.sheet ? " · " + escapeHtml(line.sheet) : "") +
        "</div></td><td class='num'>" +
        fmtMoney2(line.unit_price) +
        "</td><td class='num'><input type='number' min='0' step='1' class='rfid-qty-input' data-id='" +
        escapeHtml(line.id) +
        "' value='" +
        line.qty +
        "' /></td><td class='num'>" +
        fmtMoney2(line.extended) +
        "</td></tr>";
    });
    body.innerHTML = html;
    $("#rfidSubtotal").textContent = fmtMoney2(est.subtotal);
    if ($("#rfidAssumption")) {
      $("#rfidAssumption").textContent =
        est.assumption_note ||
        "ASSUMPTION: default qtys from heuristics. Edit any qty.";
    }
    if ($("#rfidPassthrough") && est.consumer_passthrough) {
      const cp = est.consumer_passthrough;
      $("#rfidPassthrough").textContent =
        "Consumer pass-through (NOT promoter opex): ticket fee $" +
        Number(cp.ticket_fee_consumer).toFixed(2) +
        " · fulfill fee $" +
        Number(cp.fulfill_fee_consumer).toFixed(2);
    }
    // Re-bind qty inputs
    $$(".rfid-qty-input").forEach(function (inp) {
      inp.addEventListener("change", function () {
        setRfidQtyOverride(inp.dataset.id, inp.value);
        recalculate();
      });
    });
    if (prevFocus) {
      const el = document.querySelector('.rfid-qty-input[data-id="' + prevFocus + '"]');
      if (el) {
        el.focus();
        if (prevSel) {
          try {
            el.setSelectionRange(prevSel[0], prevSel[1]);
          } catch (e) {}
        }
      }
    }
  }

  function renderCompetitors(profile, r) {
    const self = {
      ...profile,
      N: r.N,
      attendance: r.N,
      category: profile.type || profile.category,
      subcategory: profile.subtype || profile.subcategory,
      start: profile.start_date || profile.start,
      end: profile.end_date || profile.end,
    };
    const out = Competitors.match(self, festivals);
    const box = $("#competitorList");
    if (out.empty) {
      box.innerHTML =
        "<div class='banner info'>" +
        out.message +
        "</div><p class='footer-note'>Top 0 — competitor UI idle until festivals.json is populated. Never invents festivals.</p>";
      return;
    }
    if (!out.matches.length) {
      box.innerHTML = "<div class='banner warn'>" + out.message + "</div>";
      return;
    }
    box.innerHTML =
      "<p class='banner info'>" +
      out.message +
      "</p>" +
      out.matches
        .map((m) => {
          const f = m.festival;
          const title = f.name || f.title || "Unnamed";
          const where = [f.city, f.state].filter(Boolean).join(", ");
          return (
            "<div class='competitor'><div class='title'><span>" +
            escapeHtml(title) +
            (where ? " · " + escapeHtml(where) : "") +
            "</span><span>score " +
            m.score +
            (m.stale ? " <span class='badge'>directory match, dates may be stale</span>" : "") +
            "</span></div><div class='reasons'>" +
            escapeHtml(m.reasons.join(" · ") || "—") +
            "</div></div>"
          );
        })
        .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runReconcile() {
    const report = BudgetEngine.reconcileAtN0(model);
    const box = $("#reconcileBox");
    let html =
      "<div class='banner " +
      (report.pass ? "pass" : "fail") +
      "'>Reconcile at N=" +
      report.N +
      ": " +
      (report.pass ? "PASS" : "FAIL") +
      " (tolerance $1)</div>";
    html += "<table class='pnl'><thead><tr><th>Cell</th><th class='num'>Sheet</th><th class='num'>Model</th><th class='num'>Δ</th><th></th></tr></thead><tbody>";
    report.dollar.forEach((row) => {
      html +=
        "<tr><td>" +
        row.label +
        "</td><td class='num'>" +
        fmtMoney2(row.sheet) +
        "</td><td class='num'>" +
        fmtMoney2(row.model) +
        "</td><td class='num'>" +
        fmtMoney2(row.delta) +
        "</td><td>" +
        (row.pass ? "PASS" : "FAIL") +
        "</td></tr>";
    });
    html += "</tbody></table>";
    box.innerHTML = html;
    showPanel("reconcile");
  }

  function runMonteCarlo() {
    const { options } = readForm();
    const preset = $("#mcPreset").value;
    $("#mcStatus").textContent = "Running 5,000 draws…";
    // Yield to UI
    setTimeout(() => {
      const result = MonteCarlo.run(model, options, { draws: 5000, preset: preset, seed: 42 });
      lastMC = result;
      $("#mcStatus").textContent = "";
      $("#mcSentence").textContent = result.sentence;
      $("#mcP10").textContent = fmtMoney(result.P10);
      $("#mcP50").textContent = fmtMoney(result.P50);
      $("#mcP90").textContent = fmtMoney(result.P90);
      $("#mcPProfit").textContent = Math.round(result.pProfit * 100) + "%";
      $("#mcPCover").textContent = Math.round(result.pCover * 100) + "%";

      const maxSwing = Math.max(...result.tornado.map((t) => t.swing), 1);
      $("#tornado").innerHTML = result.tornado
        .map((t) => {
          const pct = (t.swing / maxSwing) * 100;
          return (
            "<div class='row'><div>" +
            escapeHtml(t.name) +
            "</div><div class='bar-wrap'><div class='bar' style='left:0;width:" +
            pct +
            "%' title='low " +
            fmtMoney(t.low) +
            " · high " +
            fmtMoney(t.high) +
            "'></div></div></div>"
          );
        })
        .join("");
      showPanel("montecarlo");
    }, 30);
  }

  function showPanel(id) {
    $$(".panel-stack").forEach((p) => p.classList.remove("active"));
    $$(".tabs button").forEach((b) => b.classList.remove("active"));
    const panel = $("#panel-" + id);
    if (panel) panel.classList.add("active");
    const btn = document.querySelector('.tabs button[data-panel="' + id + '"]');
    if (btn) btn.classList.add("active");
  }

  function wire() {
    $("#marketingPct").addEventListener("input", (e) => {
      $("#marketingPctLabel").textContent = e.target.value + "%";
    });

    [
      "attendance",
      "ticketPrice",
      "campFee",
      "pCamp",
      "marketingPct",
      "marketingCap",
      "musicFocus",
      "experienceFocus",
      "campingOn",
      "lastMinute",
      "scaleAncillaries",
      "festName",
      "festType",
      "festSubtype",
      "city",
      "state",
      "startDate",
      "endDate",
    ].forEach((id) => {
      const el = $("#" + id);
      if (el) el.addEventListener("change", recalculate);
      if (el && (el.type === "number" || el.type === "range"))
        el.addEventListener("input", () => {
          if (id === "marketingPct") return; // label only until change debounce — still recalc
          recalculate();
        });
    });
    $("#marketingPct").addEventListener("change", recalculate);

    if ($("#rfidEnabled")) {
      $("#rfidEnabled").addEventListener("change", function () {
        if (!$("#rfidEnabled").checked) {
          window.__rfidQtyOverrides = {};
        }
        recalculate();
      });
    }
    if ($("#cashlessMode")) {
      $("#cashlessMode").addEventListener("change", recalculate);
    }

    $("#btnRecalc").addEventListener("click", recalculate);
    $("#btnReconcile").addEventListener("click", runReconcile);
    $("#btnMC").addEventListener("click", runMonteCarlo);
    $("#btnSave").addEventListener("click", saveDraft);
    $("#btnLoad").addEventListener("click", loadDraft);
    $("#btnPoster").addEventListener("click", () => {
      const { profile } = readForm();
      if (lastPnL) profile.N = lastPnL.N;
      Poster.download(profile, lastPnL);
    });
    $("#btnTemplates").addEventListener("click", () => {
      const { profile } = readForm();
      Templates.downloadAll(profile);
    });

    $$(".tabs button").forEach((b) => {
      b.addEventListener("click", () => showPanel(b.dataset.panel));
    });
  }

  function init() {
    model = window.BUDGET_MODEL;
    festivals = Array.isArray(window.FESTIVALS) ? window.FESTIVALS : [];
    if (!model) {
      flash("BUDGET_MODEL missing — check baked_data.js", "fail");
      return;
    }
    applyDefaultsToForm();
    // Baseline UI should match sheet without music-focus multiplier for reconcile demos;
    // product default: music focus on. User can reconcile with button (engine ignores wizard).
    wire();
    recalculate();
    showPanel("pnl");
    flash(
      "Loaded Master Budget (N0=" +
        model.baseline.N0 +
        "). Festivals: " +
        festivals.length +
        ". Drafts stay in localStorage.",
      "info"
    );
    // Full festivals.json (~7.7MB, 26,780 rows) via fetch — not baked into HTML.
    // Requires static server (npx serve, python -m http.server, etc.).
    flash("Loading festivals.json…", "info");
    try {
      fetch("festivals.json", { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!Array.isArray(data)) throw new Error("festivals.json not an array");
          festivals = data;
          window.FESTIVALS = data;
          const { profile } = readForm();
          if (lastPnL) renderCompetitors({ ...profile, N: lastPnL.N, attendance: lastPnL.N, start: profile.start_date, end: profile.end_date, category: profile.type, subcategory: profile.subtype }, lastPnL);
          flash(
            "Festivals directory loaded: " + festivals.length.toLocaleString() + " events (fetch). Historical years labeled stale.",
            "info"
          );
        })
        .catch(function (err) {
          flash(
            "Could not fetch festivals.json (" + (err && err.message ? err.message : err) + "). Serve statically: npx serve /workspace/festival-forecaster — competitor panel stays empty (never invents).",
            "warn"
          );
        });
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
