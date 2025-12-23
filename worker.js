export default {
  async fetch(request, env) {

    // Only POST allowed
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON safely
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: "INVALID_JSON" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const code = (data.code || "").trim();

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, error: "NO_CODE" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Check KV
    const value = await env.CODES.get(code);

    // Code not found
    if (value === null) {
      return new Response(
        JSON.stringify({ ok: false, error: "INVALID_CODE" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Already used
    if (value === "USED") {
      return new Response(
        JSON.stringify({ ok: false, used: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Mark as USED
    await env.CODES.put(code, "USED");

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
