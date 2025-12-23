// =======================================================
// ESP8266 ACTIVATION & ADMIN WORKER
// MASTER FINAL — BROWSER + CORS SAFE
// =======================================================

// ---------- RESPONSE HELPER ----------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// ---------- TOKEN ----------
function randomToken() {
  return crypto.randomUUID() + "-" + Date.now();
}

// =======================================================
// WORKER
// =======================================================
export default {
  async fetch(request, env) {

    // ---------- CORS PREFLIGHT ----------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // ---------- ONLY POST ----------
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    // ---------- PARSE JSON ----------
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" });
    }

    const action = body.action;

    // ===================================================
    // 🔐 USER: VERIFY ACTIVATION CODE
    // ===================================================
    if (action === "verify") {

      const code = (body.code || "").trim();
      if (!code) {
        return json({ ok: false, reason: "NO_CODE" });
      }

      const status = await env.CODES.get(code);

      if (status === null) {
        return json({ ok: false, reason: "INVALID" });
      }

      if (status === "USED") {
        return json({ ok: false, reason: "USED" });
      }

      if (status === "DISABLED") {
        return json({ ok: false, reason: "DISABLED" });
      }

      if (status === "NEW") {
        await env.CODES.put(code, "USED");
        return json({ ok: true });
      }

      return json({ ok: false });
    }

    // ===================================================
    // 👑 ADMIN LOGIN
    // ===================================================
    if (action === "admin_login") {

      const password = body.password;
      if (!password) {
        return json({ ok: false });
      }

      if (password !== env.ADMIN_PASSWORD) {
        return json({ ok: false });
      }

      const token = randomToken();
      await env.ADMINS.put(token, "VALID", {
        expirationTtl: 60 * 60 // 1 hour
      });

      return json({ ok: true, token });
    }

    // ===================================================
    // 🔒 ADMIN AUTH CHECK
    // ===================================================
    async function isAdmin(token) {
      if (!token) return false;
      const v = await env.ADMINS.get(token);
      return v === "VALID";
    }

    // ===================================================
    // 📜 ADMIN: LIST CODES
    // ===================================================
    if (action === "list") {

      if (!(await isAdmin(body.token))) {
        return json({ ok: false, error: "UNAUTHORIZED" }, 401);
      }

      const result = [];
      const all = await env.CODES.list();

      for (const item of all.keys) {
        const v = await env.CODES.get(item.name);
        result.push({
          code: item.name,
          status: v
        });
      }

      return json({ ok: true, codes: result });
    }

    // ===================================================
    // ➕ ADMIN: ADD CODE
    // ===================================================
    if (action === "add") {

      if (!(await isAdmin(body.token))) {
        return json({ ok: false, error: "UNAUTHORIZED" }, 401);
      }

      const code = (body.code || "").trim();
      if (!code) {
        return json({ ok: false, error: "NO_CODE" });
      }

      const exist = await env.CODES.get(code);
      if (exist !== null) {
        return json({ ok: false, error: "EXISTS" });
      }

      await env.CODES.put(code, "NEW");
      return json({ ok: true });
    }

    // ===================================================
    // 🚫 ADMIN: DISABLE CODE
    // ===================================================
    if (action === "disable") {

      if (!(await isAdmin(body.token))) {
        return json({ ok: false, error: "UNAUTHORIZED" }, 401);
      }

      const code = (body.code || "").trim();
      if (!code) {
        return json({ ok: false, error: "NO_CODE" });
      }

      const exist = await env.CODES.get(code);
      if (exist === null) {
        return json({ ok: false, error: "NOT_FOUND" });
      }

      await env.CODES.put(code, "DISABLED");
      return json({ ok: true });
    }

    // ===================================================
    // ❌ UNKNOWN ACTION
    // ===================================================
    return json({ ok: false, error: "UNKNOWN_ACTION" });
  }
};
