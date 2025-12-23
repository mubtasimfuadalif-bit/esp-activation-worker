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
      return Response.json({ ok: false, error: "Invalid JSON" });
    }

    const action = body.action || "";
    const code = (body.code || "").trim();
    const adminPassword = body.adminPassword || "";

    // =========================
    // ADMIN PASSWORD (BACKEND ONLY)
    // =========================
    const ADMIN_PASSWORD = "ALIF-ESP-D7T5-JON7";

    // =========================
    // ADMIN: ADD NEW CODE
    // =========================
    if (action === "admin_add") {
      if (adminPassword !== ADMIN_PASSWORD) {
        return Response.json({ ok: false, error: "Unauthorized" });
      }

      if (!code) {
        return Response.json({ ok: false, error: "No code provided" });
      }

      const exists = await env.CODES.get(code);
      if (exists) {
        return Response.json({ ok: false, error: "Code already exists" });
      }

      await env.CODES.put(code, "UNUSED");
      return Response.json({ ok: true, added: code });
    }

    // =========================
    // USER: VERIFY CODE
    // =========================
    if (action === "verify") {
      if (!code) {
        return Response.json({ ok: false, error: "No code" });
      }

      const status = await env.CODES.get(code);

      if (status === null) {
        return Response.json({ ok: false });
      }

      if (status === "USED") {
        return Response.json({ ok: false, used: true });
      }

      // Mark as USED
      await env.CODES.put(code, "USED");
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "Invalid action" });
  }
};
