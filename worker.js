export default {
  async fetch(request, env) {

    // ---------- Helpers ----------
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });

    // ---------- Method check ----------
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    // ---------- Parse JSON ----------
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const action = (body.action || "").trim();
    const code   = (body.code   || "").trim();
    const admin  = (body.admin  || "").trim();

    // ---------- Basic validation ----------
    if (!action) {
      return json({ ok: false, error: "No action" }, 400);
    }

    // =====================================================
    // 🔐 ADMIN: ADD NEW ACTIVATION CODE
    // =====================================================
    if (action === "add") {

      if (admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) {
        return json({ ok: false, error: "No code provided" }, 400);
      }

      const exists = await env.CODES.get(code);
      if (exists !== null) {
        return json({ ok: false, error: "Code already exists" });
      }

      await env.CODES.put(code, "NEW");

      return json({ ok: true, added: code });
    }

    // =====================================================
    // 🔑 USER: VERIFY ACTIVATION CODE (ONE-TIME)
    // =====================================================
    if (action === "verify") {

      if (!code) {
        return json({ ok: false, error: "No code provided" }, 400);
      }

      const value = await env.CODES.get(code);

      if (value === null) {
        return json({ ok: false, error: "Invalid code" });
      }

      if (value === "USED") {
        return json({ ok: false, used: true });
      }

      if (value === "DISABLED") {
        return json({ ok: false, disabled: true });
      }

      // First-time valid → mark as USED
      await env.CODES.put(code, "USED");

      return json({ ok: true });
    }

    // =====================================================
    // 🚫 ADMIN: DISABLE CODE (SAFE BLOCK)
    // =====================================================
    if (action === "disable") {

      if (admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      if (!code) {
        return json({ ok: false, error: "No code provided" }, 400);
      }

      const value = await env.CODES.get(code);
      if (value === null) {
        return json({ ok: false, error: "Code not found" });
      }

      await env.CODES.put(code, "DISABLED");

      return json({ ok: true, disabled: code });
    }

    // =====================================================
    // 📋 ADMIN: LIST ALL CODES + STATUS
    // =====================================================
    if (action === "list") {

      if (admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const list = [];
      let cursor;

      do {
        const res = await env.CODES.list({ cursor });
        cursor = res.cursor;

        for (const key of res.keys) {
          const val = await env.CODES.get(key.name);
          list.push({
            code: key.name,
            status: val,
            used: val === "USED",
            disabled: val === "DISABLED"
          });
        }

      } while (cursor);

      return json(list);
    }

    // =====================================================
    // ❌ UNKNOWN ACTION
    // =====================================================
    return json({ ok: false, error: "Unknown action" }, 400);
  }
};
