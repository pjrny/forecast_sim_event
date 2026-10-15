#!/usr/bin/env node
/**
 * Mock organizer Worker for local tests (NOT production).
 *   POST /api/drafts                       anon → {draft_id, claim_token}
 *   GET  /claim?draft=&t=                  → 200 html (or 403)
 *   POST /api/organizer/drafts             (Authorization: Bearer test | mock session) → {draft_id}
 *   GET  /api/organizer/drafts/:id         → draft
 *   POST /api/organizer/drafts/:id/create  → {odoo_event_id, dashboard_url, public_url}
 * Validates with js/event_draft.js; forces ticket price 0; strips forecast before "Odoo".
 * Usage: node scripts/mock_worker.js [port]   or require() → start(port) → {server, url, store}
 */
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const ED = require(path.join(__dirname, "..", "js", "event_draft.js"));

function start(port) {
  const store = { drafts: new Map(), events: [] };
  let nextEvent = 1000;
  const send = (res, code, obj, type) => {
    res.writeHead(code, {
      "Content-Type": type || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    res.end(typeof obj === "string" ? obj : JSON.stringify(obj));
  };
  const body = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { ok(null); } }); });
  const authed = (req) => /^Bearer\s+\S+/.test(req.headers.authorization || "") || req.headers["x-mock-session"] === "1";

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    if (req.method === "OPTIONS") return send(res, 204, "");
    if (req.method === "POST" && u.pathname === "/api/drafts") {
      const d = await body(req);
      const v = ED.validateEventDraft(d);
      if (!v.ok) return send(res, 422, { error: "invalid draft", errors: v.errors });
      const id = "drf_" + crypto.randomBytes(6).toString("hex");
      const tok = crypto.randomBytes(16).toString("hex");
      store.drafts.set(id, { draft: d, claim_token: tok, owner: null, created: Date.now(), expires: Date.now() + 7 * 864e5 });
      return send(res, 201, { draft_id: id, claim_token: tok });
    }
    if (req.method === "GET" && u.pathname === "/claim") {
      const r = store.drafts.get(u.searchParams.get("draft"));
      if (!r || r.claim_token !== u.searchParams.get("t")) return send(res, 403, { error: "bad claim" });
      return send(res, 200, "<p>Sign in to claim draft " + u.searchParams.get("draft") + "</p>", "text/html");
    }
    if (u.pathname.startsWith("/api/organizer/")) {
      if (!authed(req)) return send(res, 401, { error: "auth required" });
      if (req.method === "POST" && u.pathname === "/api/organizer/drafts") {
        const d = await body(req);
        const v = ED.validateEventDraft(d);
        if (!v.ok) return send(res, 422, { error: "invalid draft", errors: v.errors });
        const id = "drf_" + crypto.randomBytes(6).toString("hex");
        store.drafts.set(id, { draft: d, owner: "session", created: Date.now() });
        return send(res, 201, { draft_id: id });
      }
      const m = /^\/api\/organizer\/drafts\/([^/]+)(\/create)?$/.exec(u.pathname);
      if (m) {
        const r = store.drafts.get(m[1]);
        if (!r) return send(res, 404, { error: "not found" });
        if (req.method === "GET" && !m[2]) return send(res, 200, r.draft);
        if (req.method === "POST" && m[2]) {
          const odoo = ED.odooFields(r.draft);
          odoo.tickets = (odoo.tickets || []).map((t) => Object.assign({}, t, { price: 0 }));
          const id = nextEvent++;
          store.events.push({ id, odoo, d1_forecast: r.draft.forecast || null });
          return send(res, 200, { odoo_event_id: id, dashboard_url: "/organizer/events/" + id, public_url: "/event/" + id });
        }
      }
    }
    send(res, 404, { error: "no route" });
  });
  return new Promise((ok) => server.listen(port || 0, "127.0.0.1", () => ok({ server, store, url: "http://127.0.0.1:" + server.address().port })));
}

module.exports = { start };
if (require.main === module) start(Number(process.argv[2]) || 8787).then((s) => console.log("mock worker on", s.url));
