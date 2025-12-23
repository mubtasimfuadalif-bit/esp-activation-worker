if (request.method === "GET") {
  return new Response("WORKER IS ALIVE", {
    headers: { "Content-Type": "text/plain" }
  });
}
