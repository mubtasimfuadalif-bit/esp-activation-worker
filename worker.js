export default {
  async fetch(request, env) {

    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: "Invalid JSON"
      }), { headers: { "Content-Type": "application/json" } });
    }

    const action = data.action;

    // ===== VERIFY =====
    if (action === "verify") {
      const code = (data.code || "").trim();
      if (!code) {
        return new Response(JSON.stringify({ ok: false }), { headers: { "Content-Type": "application/json" } });
      }

      const value = await env.ACTIVATION_CODES.get(code);

      if (value === null) {
        return new Response(JSON.stringify({ ok: false }), { headers: { "Content-Type": "application/json" } });
      }

      if (value === "USED") {
        return new Response(JSON.stringify({ ok: false, used: true }), { headers: { "Content-Type": "application/json" } });
      }

      await env.ACTIVATION_CODES.put(code, "USED");

      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    // ===== ADD =====
    if (action === "add") {
      if (data.admin !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({
          ok: false,
          error: "Unauthorized"
        }), { headers: { "Content-Type": "application/json" } });
      }

      const code = (data.code || "").trim();
      if (!code) {
        return new Response(JSON.stringify({
          ok: false,
          error: "No code"
        }), { headers: { "Content-Type": "application/json" } });
      }

      await env.ACTIVATION_CODES.put(code, "NEW");

      return new Response(JSON.stringify({
        ok: true,
        added: true
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: false,
      error: "Invalid action"
    }), { headers: { "Content-Type": "application/json" } });
  }
};
