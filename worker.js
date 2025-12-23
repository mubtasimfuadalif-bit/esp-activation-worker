// =======================================================
// ESP8266 ACTIVATION & ADMIN WORKER
// MASTER FINAL VERSION
// =======================================================

// --------- HELPERS ----------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

function randomToken() {
  return crypto.randomUUID() + "-" + Date.now();
}

// --------- WORKER ----------
export default {
  async fetch(request, env) {

    // ---- CORS preflight ----
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" });
    }

    const action = body.action;

    // ===================================================
    // 🔐 USER ACTIVATION VERIFY
    // ===================================================
    if (action === "verify") {

      const code = (body.code || "").trim();
      if (!code) {
        return json({ ok: false, error: "No code" });
      }

      const status = await env.CODES.get(code);

      // code does not exist
      if (status === null) {
        return json({ ok: false, reason: "INVALID" });
      }

      // already used
      if (status === "USED") {
        return json({ ok: false, reason: "USED" });
      }

      // disabled by admin
      if (status === "DISABLED") {
        return json({ ok: false, reason: "DISABLED" });
      }

      // NEW → USED
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

      // password check (SECRET)
      if (password !== env.ADMIN_PASSWORD) {
        return json({ ok: false });
      }

      // issue token
      const token = randomToken();
      await env.ADMINS.put(token, "VALID", { expirationTtl: 60 * 60 }); // 1 hour

      return json({ ok: true, token });
    }

    // ===================================================
    // 🔒 ADMIN AUTH CHECK
    // ===================================================
    async function checkAdmin(token) {
      if (!token) return false;
      const v = await env.ADMINS.get(token);
      return v === "VALID";
    }

    // ===================================================
    // 📜 ADMIN: LIST CODES
    // ===================================================
    if (action === "list") {

      const token = body.token;
      if (!(await checkAdmin(token))) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const list = [];
      const all = await env.CODES.list();

      for (const k of all.keys) {
        const v = await env.CODES.get(k.name);
        list.push({
          code: k.name,
          status: v
        });
      }

      return json({ ok: true, codes: list });
    }

    // ===================================================
    // ➕ ADMIN: ADD CODE
    // ===================================================
    if (action === "add") {

      const token = body.token;
      const code = (body.code || "").trim();

      if (!(await checkAdmin(token))) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) {
        return json({ ok: false, error: "No code" });
      }

      const exist = await env.CODES.get(code);
      if (exist !== null) {
        return json({ ok: false, error: "Already exists" });
      }

      await env.CODES.put(code, "NEW");
      return json({ ok: true });
    }

    // ===================================================
    // 🚫 ADMIN: DISABLE CODE
    // ===================================================
    if (action === "disable") {

      const token = body.token;
      const code = (body.code || "").trim();

      if (!(await checkAdmin(token))) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) {
        return json({ ok: false });
      }

      const exist = await env.CODES.get(code);
      if (exist === null) {
        return json({ ok: false, error: "Not found" });
      }

      await env.CODES.put(code, "DISABLED");
      return json({ ok: true });
    }

    // ===================================================
    // ❌ UNKNOWN ACTION
    // ===================================================
    return json({ ok: false, error: "Unknown action" });
  }
};
