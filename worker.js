export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json({ ok: false, error: "POST only" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" });
    }

    const action = body.action;
    const code = (body.code || "").trim();

    // -----------------------------
    // VERIFY (User side)
    // -----------------------------
    if (action === "verify") {
      if (!code) return json({ ok: false, error: "No code" });

      const value = await env.CODES.get(code);

      if (value === null) {
        return json({ ok: false, error: "Invalid code" });
      }

      if (value === "USED") {
        return json({ ok: false, used: true });
      }

      await env.CODES.put(code, "USED");
      return json({ ok: true });
    }

    // -----------------------------
    // ADMIN ADD CODE
    // -----------------------------
    if (action === "add") {
      const admin = (body.admin || "").trim();

      if (!admin || admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) return json({ ok: false, error: "No code" });

      await env.CODES.put(code, "NEW");
      return json({ ok: true, added: code });
    }

    return json({ ok: false, error: "Invalid action" });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
