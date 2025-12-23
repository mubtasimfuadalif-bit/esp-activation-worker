export default {
  async fetch(request, env) {
    /* ===================== CORS ===================== */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return json({
        ok: false,
        error: "POST only"
      });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({
        ok: false,
        error: "Invalid JSON body"
      });
    }

    const action = data.action;

    /* ===================== VERIFY ===================== */
    if (action === "verify") {
      const code = normalize(data.code);
      if (!code) {
        return json({
          ok: false,
          error: "Code missing"
        });
      }

      const used = await env.CODES.get(code);
      if (used === "used") {
        return json({
          ok: false,
          used: true,
          error: "Code already used"
        });
      }

      if (used === null) {
        return json({
          ok: false,
          error: "Invalid code"
        });
      }

      await env.CODES.put(code, "used");

      return json({
        ok: true,
        activated: true
      });
    }

    /* ===================== ADMIN LOGIN ===================== */
    if (action === "admin_login") {
      if (data.password !== env.ADMIN_PASSWORD) {
        return json({
          ok: false,
          error: "Wrong admin password"
        });
      }

      return json({
        ok: true,
        admin: true
      });
    }

    /* ===================== ADMIN ADD CODE ===================== */
    if (action === "add") {
      if (data.password !== env.ADMIN_PASSWORD) {
        return json({
          ok: false,
          error: "Unauthorized"
        });
      }

      const code = normalize(data.code);
      if (!code) {
        return json({
          ok: false,
          error: "Code missing"
        });
      }

      await env.CODES.put(code, "unused");

      return json({
        ok: true,
        added: code
      });
    }

    /* ===================== ADMIN LIST ===================== */
    if (action === "list") {
      if (data.password !== env.ADMIN_PASSWORD) {
        return json({
          ok: false,
          error: "Unauthorized"
        });
      }

      const list = [];
      const cursor = env.CODES.list();
      for await (const k of cursor) {
        const v = await env.CODES.get(k.name);
        list.push({
          code: k.name,
          status: v
        });
      }

      return json({
        ok: true,
        codes: list
      });
    }

    /* ===================== UNKNOWN ===================== */
    return json({
      ok: false,
      error: "Unknown action"
    });
  }
};

/* ===================== HELPERS ===================== */

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function normalize(v) {
  if (!v || typeof v !== "string") return null;
  return v.trim().toUpperCase();
}
