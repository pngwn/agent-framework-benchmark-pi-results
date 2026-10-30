import type { APIEvent } from "@solidjs/start/server";

const API_BASE = () => (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/+$/, "");

export async function GET(event: APIEvent) {
  const raw = (event.params as Record<string, unknown>).path;
  const path = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  try {
    const res = await fetch(`${API_BASE()}/media/${path}`);
    const headers = new Headers();
    headers.set("content-type", res.headers.get("content-type") ?? "application/octet-stream");
    headers.set("cache-control", res.headers.get("cache-control") ?? "public, max-age=3600");
    return new Response(await res.arrayBuffer(), { status: res.status, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
