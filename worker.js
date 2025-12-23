export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" });
    }

    const action = data.action;

    // 🔐 VERIFY CODE
    if (action === "verify") {
      const code = data.code;
      if (!code) return json({ ok: false, error: "Code missing" });

      const value = await env.ACTIVATION_CODES.get(code);

      if (!value) {
        return json({ ok: false });
      }

      if (value === "USED") {
        return json({ ok: false, used: true });
      }

      await env.ACTIVATION_CODES.put(code, "USED");
      return json({ ok: true });
    }

    // 🛠️ ADD CODE (ADMIN)
    if (action === "add") {
      if (data.admin !== env.ADMIN_PASSWORD) {
        return json({ ok: false, error: "Unauthorized" });
      }

      const code = data.code;
      if (!code) return json({ ok: false, error: "Code missing" });

      await env.ACTIVATION_CODES.put(code, "UNUSED");
      return json({ ok: true, added: true });
    }

    return json({ ok: false, error: "Invalid action" });
  }
};

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json" }
  });
  }
