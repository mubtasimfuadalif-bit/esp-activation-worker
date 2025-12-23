export default {
  async fetch(request, env) {

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const code = (data.code || "").trim();

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, error: "No code provided" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const value = await env.CODES.get(code);

    if (value === null) {
      return new Response(
        JSON.stringify({ ok: false }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (value === "USED") {
      return new Response(
        JSON.stringify({ ok: false, used: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    await env.CODES.put(code, "USED");

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
