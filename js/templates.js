/**
 * Blank ops templates — header: name / dates / city only.
 */
(function (global) {
  "use strict";

  function header(profile) {
    return {
      name: profile.name || "",
      dates: [profile.start_date, profile.end_date].filter(Boolean).join(" – "),
      city: [profile.city, profile.state].filter(Boolean).join(", "),
    };
  }

  function lineupAnnounceChecklist(profile) {
    const h = header(profile);
    return {
      title: "Lineup Announce Checklist",
      header: h,
      sections: [
        {
          name: "Pre-announce",
          items: [
            "Confirm artist contracts & deposits",
            "Lock announce date/time (timezone)",
            "Prepare asset kit (photos, logos, billing)",
            "Geo-fence / hold competitor ads",
            "Press list + embargo notes",
          ],
        },
        {
          name: "Announce day",
          items: [
            "Website / app drop live",
            "Email + SMS blast",
            "Social posts (IG/TikTok/FB/X)",
            "Partner / venue cross-post",
            "Ticket onsale link verified",
          ],
        },
        {
          name: "Post-announce",
          items: [
            "Monitor sell-through hourly",
            "Reply / community moderation",
            "Update FAQ + refund policy link",
            "Capture UGC + press hits",
          ],
        },
      ],
    };
  }

  function artistsMarketingChecklist(profile) {
    const h = header(profile);
    return {
      title: "Artists Marketing Checklist",
      header: h,
      sections: [
        {
          name: "Per-artist assets",
          items: [
            "Approved photo + bio",
            "Social handles + posting windows",
            "Story templates / reel cuts",
            "Billing hierarchy check",
          ],
        },
        {
          name: "Campaign",
          items: [
            "Artist announce sequence",
            "Playlist / DSP pitch",
            "Local radio / blog outreach",
            "Paid boost budget allocation",
          ],
        },
      ],
    };
  }

  function rosCsv(profile) {
    const h = header(profile);
    const lines = [
      "# Run of Show — " + h.name,
      "# Dates: " + h.dates,
      "# City: " + h.city,
      "time,area,action,owner,notes",
      ",,,,",
      ",,,,",
      ",,,,",
      ",,,,",
      ",,,,",
    ];
    return lines.join("\n");
  }

  function marketingFunnel(profile) {
    const h = header(profile);
    return {
      title: "Marketing Funnel Stages",
      header: h,
      stages: [
        { stage: "Awareness", kpi: "Impressions / Reach", notes: "" },
        { stage: "Interest", kpi: "Site visits / Video views", notes: "" },
        { stage: "Consideration", kpi: "Email/SMS signups", notes: "" },
        { stage: "Intent", kpi: "Ticket page views", notes: "" },
        { stage: "Purchase", kpi: "Tickets sold / Conversion %", notes: "" },
        { stage: "Advocacy", kpi: "Referrals / UGC", notes: "" },
      ],
    };
  }

  function rfidUnitPriceCatalog() {
    const model =
      (typeof global !== "undefined" && global.RFID_MODEL) ||
      (typeof window !== "undefined" && window.RFID_MODEL) ||
      null;
    if (model && Array.isArray(model.catalog)) return model.catalog;
    // Offline fallback — same PRICES row as rfid_model.json
    return [
      { id: "ticketing_fee", label: "Ticketing (platform/ticket fee)", unit_price: 1.49, unit: "per_attendee" },
      { id: "scanner", label: "Access-control scanner", unit_price: 125, unit: "each" },
      { id: "truss", label: "Truss", unit_price: 20, unit: "each" },
      { id: "registration_kiosk", label: "Registration station / kiosk (AC)", unit_price: 75, unit: "each" },
      { id: "pos", label: "POS terminal", unit_price: 85, unit: "each" },
      { id: "platform_fee", label: "Platform fee(s)", unit_price: 1450, unit: "flat" },
      { id: "activation_fee", label: "Activation fee", unit_price: 0.48, unit: "per_attendee" },
      { id: "shipping_service", label: "Shipping / service", unit_price: 600, unit: "flat" },
      { id: "labor_traveling", label: "Labor (traveling)", unit_price: 600, unit: "each" },
      { id: "labor_local", label: "Labor (local)", unit_price: 450, unit: "each" },
      { id: "travel_perdiem", label: "Travel, transport, per diem", unit_price: 720, unit: "each" },
      { id: "rfid_consumable", label: "RFID wristband / consumable", unit_price: 0.45, unit: "per_attendee" },
      { id: "mail_fulfill", label: "Mail fulfillment", unit_price: 7.02, unit: "per_order" },
    ];
  }

  function rfidPosWorksheet(profile) {
    const h = header(profile);
    const catalog = rfidUnitPriceCatalog();
    return {
      title: "RFID / POS Worksheet (Basic Scenario list prices)",
      header: h,
      note:
        "Unit prices from Tool Basic Scenario Calculator PRICES row — not Master Budget. Qty blank for user; no invented spend totals.",
      unit_price_table: catalog.map(function (c) {
        return {
          id: c.id,
          label: c.label,
          unit_price: c.unit_price,
          unit: c.unit,
          qty: "",
          extended: "",
        };
      }),
      consumer_passthrough: [
        { field: "Consumer ticket fee (pass-through, NOT opex)", value: "7.00" },
        { field: "Consumer fulfill fee (pass-through, NOT opex)", value: "4.99" },
      ],
      placeholders: [
        { field: "Gate / entrance count", value: "" },
        { field: "RFID wristband SKU", value: "" },
        { field: "Encoder stations", value: "" },
        { field: "POS vendor", value: "" },
        { field: "Cashless mode (closed/open/hybrid/none)", value: "" },
        { field: "Cashless % target", value: "" },
        { field: "Offline mode plan", value: "" },
        { field: "Settlement contact", value: "" },
        { field: "Chargeback process", value: "" },
      ],
    };
  }

  function toMarkdown(doc) {
    let md = "# " + doc.title + "\n\n";
    md += "**Festival:** " + (doc.header.name || "—") + "  \n";
    md += "**Dates:** " + (doc.header.dates || "—") + "  \n";
    md += "**City:** " + (doc.header.city || "—") + "\n\n";
    if (doc.sections) {
      doc.sections.forEach((sec) => {
        md += "## " + sec.name + "\n";
        sec.items.forEach((it) => {
          md += "- [ ] " + it + "\n";
        });
        md += "\n";
      });
    }
    if (doc.stages) {
      md += "| Stage | KPI | Notes |\n|---|---|---|\n";
      doc.stages.forEach((s) => {
        md += "| " + s.stage + " | " + s.kpi + " |  |\n";
      });
    }
    if (doc.note) {
      md += "> " + doc.note + "\n\n";
    }
    if (doc.unit_price_table && doc.unit_price_table.length) {
      md += "## Unit price table (Basic Scenario PRICES)\n\n";
      md += "| Line | Unit price | Unit | Qty (fill in) | Extended |\n|---|---:|---|---:|---:|\n";
      doc.unit_price_table.forEach((r) => {
        md +=
          "| " +
          r.label +
          " | " +
          Number(r.unit_price).toFixed(2) +
          " | " +
          (r.unit || "") +
          " |  |  |\n";
      });
      md += "\n";
    }
    if (doc.consumer_passthrough) {
      md += "## Consumer pass-through (NOT promoter opex)\n\n";
      doc.consumer_passthrough.forEach((p) => {
        md += "- **" + p.field + ":** " + (p.value || "__________________") + "\n";
      });
      md += "\n";
    }
    if (doc.placeholders) {
      md += "## Ops checklist\n\n";
      doc.placeholders.forEach((p) => {
        md += "- **" + p.field + ":** __________________\n";
      });
    }
    return md;
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadAll(profile) {
    const safe = (profile.name || "festival").replace(/[^\w\-]+/g, "_").slice(0, 40);
    downloadText(safe + "_lineup_announce.md", toMarkdown(lineupAnnounceChecklist(profile)), "text/markdown");
    downloadText(safe + "_artists_marketing.md", toMarkdown(artistsMarketingChecklist(profile)), "text/markdown");
    downloadText(safe + "_ros.csv", rosCsv(profile), "text/csv");
    downloadText(safe + "_marketing_funnel.md", toMarkdown(marketingFunnel(profile)), "text/markdown");
    downloadText(safe + "_rfid_pos.md", toMarkdown(rfidPosWorksheet(profile)), "text/markdown");
  }

  global.Templates = {
    lineupAnnounceChecklist,
    artistsMarketingChecklist,
    rosCsv,
    marketingFunnel,
    rfidPosWorksheet,
    toMarkdown,
    downloadAll,
    downloadText,
  };
})(typeof window !== "undefined" ? window : global);
