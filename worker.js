export default {
  async fetch(request, env) {
    // Only POST allowed
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const code = (data.code || "").trim();

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, error: "Empty code" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Read from KV
    const value = await env.CODES.get(code);

    // Code not found
    if (value === null) {
      return new Response(
        JSON.stringify({ ok: false }),
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

    // Mark as used
    await env.CODES.put(code, "USED");

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
