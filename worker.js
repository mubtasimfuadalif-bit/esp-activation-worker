export default {
  async fetch(request, env) {
    // Only POST allowed
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const { action, code, adminPassword } = body;

    // ---------- USER: VERIFY ACTIVATION CODE ----------
    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return json({ ok: false, error: "No code provided" }, 400);
      }

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

    // ---------- ADMIN AUTH ----------
    if (action === "admin") {
      if (!adminPassword || adminPassword !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      // Add new activation code
      if (body.subAction === "add") {
        const newCode = body.newCode;
        if (!newCode) {
          return json({ ok: false, error: "No code provided" });
        }

        await env.CODES.put(newCode, "UNUSED");
        return json({ ok: true, added: newCode });
      }

      // Check status of a code
      if (body.subAction === "check") {
        const checkCode = body.checkCode;
        const status = await env.CODES.get(checkCode);
        return json({
          ok: true,
          code: checkCode,
          status: status || "NOT_FOUND",
        });
      }

      return json({ ok: false, error: "Unknown admin action" }, 400);
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
