// Client-safe URL helpers. The API origin is provided by the root loader.
import { useRouteLoaderData } from "react-router";

export function useApiBase(): string {
  const data = useRouteLoaderData<{ apiBase: string }>("root");
  return data?.apiBase ?? "";
}

export function spriteUrl(apiBase: string, id: number): string {
  return `${apiBase}/media/sprites/pokemon/${id}.png`;
}
