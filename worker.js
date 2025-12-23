// =======================
// CORS HEADERS
// =======================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// =======================
// WORKER
// =======================
export default {
  async fetch(request, env) {

    // -----------------------
    // CORS Preflight
    // -----------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // -----------------------
    // Only POST allowed
    // -----------------------
    if (request.method !== "POST") {
      return json(
        { ok: false, error: "Method not allowed" },
        405
      );
    }

    // -----------------------
    // Parse JSON
    // -----------------------
    let data;
    try {
      data = await request.json();
    } catch {
      return json(
        { ok: false, error: "Invalid JSON" },
        400
      );
    }

    const action = (data.action || "").toLowerCase();
    const code = (data.code || "").trim();
    const admin = (data.admin || "").trim();

    // -----------------------
    // VERIFY CODE
    // -----------------------
    if (action === "verify") {
      if (!code) {
        return json({ ok: false, error: "No code" });
      }

      const value = await env.CODES.get(code);

      if (value === null) {
        return json({ ok: false, error: "Invalid code" });
      }

      if (value === "USED") {
        return json({ ok: false, used: true });
      }

      // mark as USED
      await env.CODES.put(code, "USED");

      return json({ ok: true });
    }

    // -----------------------
    // ADMIN ADD CODE
    // -----------------------
    if (action === "add") {
      if (!admin || admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) {
        return json({ ok: false, error: "No code provided" });
      }

      const exists = await env.CODES.get(code);
      if (exists !== null) {
        return json({ ok: false, error: "Code already exists" });
      }

      await env.CODES.put(code, "NEW");

      return json({
        ok: true,
        added: code,
      });
    }

    // -----------------------
    // ADMIN LIST CODES
    // -----------------------
    if (action === "list") {
      if (!admin || admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const list = await env.CODES.list();
      const result = [];

      for (const key of list.keys) {
        const value = await env.CODES.get(key.name);
        result.push({
          code: key.name,
          status: value,
        });
      }

      return json({
        ok: true,
        codes: result,
      });
    }

    // -----------------------
    // UNKNOWN ACTION
    // -----------------------
    return json({ ok: false, error: "Invalid action" }, 400);
  },
};

// =======================
// JSON RESPONSE HELPER
// =======================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
