export default {
  async fetch(request, env) {
    const CORS_HEADERS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ ok: false, error: "POST only" }),
          { headers: CORS_HEADERS }
        );
      }

      const data = await request.json();

      // ==============================
      // CONFIG
      // ==============================
      const ADMIN_PASSWORD = env.ADMIN_PASSWORD; // Cloudflare secret
      const KV = env.CODES; // KV namespace binding name

      // ==============================
      // ADMIN LOGIN
      // ==============================
      if (data.action === "admin_login") {
        if (!data.password) {
          return json({ ok: false, error: "Password required" }, CORS_HEADERS);
        }

        if (data.password !== ADMIN_PASSWORD) {
          return json({ ok: false, error: "Invalid admin password" }, CORS_HEADERS);
        }

        return json({ ok: true }, CORS_HEADERS);
      }

      // ==============================
      // ADD ACTIVATION CODE (ADMIN)
      // ==============================
      if (data.action === "add") {
        if (data.admin !== ADMIN_PASSWORD) {
          return json({ ok: false, error: "Unauthorized" }, CORS_HEADERS);
        }

        if (!data.code) {
          return json({ ok: false, error: "Code required" }, CORS_HEADERS);
        }

        await KV.put(data.code, JSON.stringify({
          used: false,
          created: Date.now()
        }));

        return json({ ok: true, added: data.code }, CORS_HEADERS);
      }

      // ==============================
      // VERIFY ACTIVATION CODE (USER)
      // ==============================
      if (data.action === "verify") {
        if (!data.code) {
          return json({ ok: false, error: "Code required" }, CORS_HEADERS);
        }

        const record = await KV.get(data.code);

        if (!record) {
          return json({ ok: false, error: "Invalid code" }, CORS_HEADERS);
        }

        const parsed = JSON.parse(record);

        if (parsed.used === true) {
          return json({ ok: false, used: true }, CORS_HEADERS);
        }

        // Mark as used immediately
        parsed.used = true;
        parsed.usedAt = Date.now();
        await KV.put(data.code, JSON.stringify(parsed));

        return json({ ok: true }, CORS_HEADERS);
      }

      // ==============================
      // LIST CODES (ADMIN)
      // ==============================
      if (data.action === "list") {
        if (data.admin !== ADMIN_PASSWORD) {
          return json({ ok: false, error: "Unauthorized" }, CORS_HEADERS);
        }

        const list = await KV.list();
        const result = [];

        for (const key of list.keys) {
          const value = await KV.get(key.name);
          result.push({
            code: key.name,
            ...JSON.parse(value)
          });
        }

        return json({ ok: true, codes: result }, CORS_HEADERS);
      }

      // ==============================
      // DISABLE CODE (ADMIN)
      // ==============================
      if (data.action === "disable") {
        if (data.admin !== ADMIN_PASSWORD) {
          return json({ ok: false, error: "Unauthorized" }, CORS_HEADERS);
        }

        if (!data.code) {
          return json({ ok: false, error: "Code required" }, CORS_HEADERS);
        }

        const record = await KV.get(data.code);
        if (!record) {
          return json({ ok: false, error: "Code not found" }, CORS_HEADERS);
        }

        const parsed = JSON.parse(record);
        parsed.used = true;
        parsed.disabled = true;
        await KV.put(data.code, JSON.stringify(parsed));

        return json({ ok: true, disabled: data.code }, CORS_HEADERS);
      }

      // ==============================
      // UNKNOWN ACTION
      // ==============================
      return json({ ok: false, error: "Invalid action" }, CORS_HEADERS);

    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err.message }),
        { headers: CORS_HEADERS }
      );
    }
  }
};

// ==============================
// HELPER
// ==============================
function json(data, headers) {
  return new Response(JSON.stringify(data), { headers });
            }
