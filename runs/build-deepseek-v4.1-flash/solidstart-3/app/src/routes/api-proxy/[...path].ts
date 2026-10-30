import type { APIEvent } from "@solidjs/start/server";

const API_BASE = () => (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/+$/, "");

export async function GET(event: APIEvent) {
  const raw = (event.params as Record<string, unknown>).path;
  const path = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  const incoming = new URL(event.request.url);
  try {
    const res = await fetch(`${API_BASE()}/api/v2/${path}${incoming.search}`, {
      headers: { accept: "application/json" },
    });
    const headers = new Headers();
    headers.set("content-type", res.headers.get("content-type") ?? "application/json");
    headers.set("cache-control", "no-store");
    return new Response(await res.arrayBuffer(), { status: res.status, headers });
  } catch {
    return new Response(JSON.stringify({ error: "API unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
