export default {
  async fetch(request, env) {

    /* ===============================
       COMMON HEADERS (CORS FIX)
    =============================== */
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    /* ===============================
       OPTIONS (Preflight)
    =============================== */
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    /* ===============================
       GET (Browser open করলে)
    =============================== */
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "ESP8266 Secure Activation Worker",
          status: "running"
        }),
        { headers }
      );
    }

    /* ===============================
       ONLY POST ALLOWED BELOW
    =============================== */
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        { headers }
      );
    }

    const action = body.action;

    /* ===============================
       ADMIN AUTH
    =============================== */
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD; // Cloudflare Secret

    function adminAuth(pass) {
      return pass && pass === ADMIN_PASSWORD;
    }

    /* ===============================
       ADD ACTIVATION CODE (ADMIN)
    =============================== */
    if (action === "add") {
      if (!adminAuth(body.admin)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Unauthorized" }),
          { headers }
        );
      }

      const code = (body.code || "").trim();
      if (!code) {
        return new Response(
          JSON.stringify({ ok: false, error: "No code provided" }),
          { headers }
        );
      }

      await env.CODES.put(code, "UNUSED");

      return new Response(
        JSON.stringify({ ok: true, added: code }),
        { headers }
      );
    }

    /* ===============================
       VERIFY ACTIVATION CODE
    =============================== */
    if (action === "verify") {
      const code = (body.code || "").trim();
      if (!code) {
        return new Response(
          JSON.stringify({ ok: false, error: "No code" }),
          { headers }
        );
      }

      const value = await env.CODES.get(code);

      if (value === null) {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid code" }),
          { headers }
        );
      }

      if (value === "USED") {
        return new Response(
          JSON.stringify({ ok: false, used: true }),
          { headers }
        );
      }

      // Mark as USED
      await env.CODES.put(code, "USED");

      return new Response(
        JSON.stringify({ ok: true }),
        { headers }
      );
    }

    /* ===============================
       DISABLE CODE (ADMIN)
    =============================== */
    if (action === "disable") {
      if (!adminAuth(body.admin)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Unauthorized" }),
          { headers }
        );
      }

      const code = (body.code || "").trim();
      if (!code) {
        return new Response(
          JSON.stringify({ ok: false, error: "No code" }),
          { headers }
        );
      }

      await env.CODES.put(code, "USED");

      return new Response(
        JSON.stringify({ ok: true, disabled: code }),
        { headers }
      );
    }

    /* ===============================
       UNKNOWN ACTION
    =============================== */
    return new Response(
      JSON.stringify({ ok: false, error: "Unknown action" }),
      { headers }
    );
  }
};
