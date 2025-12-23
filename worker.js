export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Allow only POST
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const action = body.action || "";

    /* ===============================
       USER: VERIFY ACTIVATION CODE
    =============================== */
    if (action === "verify") {
      const code = (body.code || "").trim();

      if (!code) {
        return json({ ok: false, error: "No code" });
      }

      const value = await env.ACTIVATION_CODES.get(code);

      if (value === null) {
        return json({ ok: false, error: "Invalid code" });
      }

      if (value === "USED") {
        return json({ ok: false, used: true });
      }

      await env.ACTIVATION_CODES.put(code, "USED");
      return json({ ok: true });
    }

    /* ===============================
       ADMIN AUTH
    =============================== */
    const adminPass = body.admin_password || "";
    if (adminPass !== env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    /* ===============================
       ADMIN: ADD NEW CODE
    =============================== */
    if (action === "add_code") {
      const newCode = (body.code || "").trim();
      if (!newCode) {
        return json({ ok: false, error: "Empty code" });
      }

      const exists = await env.ACTIVATION_CODES.get(newCode);
      if (exists !== null) {
        return json({ ok: false, error: "Code already exists" });
      }

      await env.ACTIVATION_CODES.put(newCode, "UNUSED");
      return json({ ok: true, added: newCode });
    }

    /* ===============================
       ADMIN: LIST ALL CODES
    =============================== */
    if (action === "list_codes") {
      const list = await env.ACTIVATION_CODES.list({ limit: 1000 });

      const result = [];
      for (const k of list.keys) {
        const v = await env.ACTIVATION_CODES.get(k.name);
        result.push({ code: k.name, status: v });
      }

      return json({ ok: true, codes: result });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
    }
