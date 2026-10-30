import { getRequestEvent, isServer } from "solid-js/web";

export const TEAM_LIMIT = 6;
export const TEAM_COOKIE = "pokedex_team";

const clean = (names: unknown): string[] => {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    if (typeof name !== "string" || !name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length === TEAM_LIMIT) break;
  }
  return out;
};

const cookieValue = (cookieHeader: string, name: string): string | undefined => {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
};

export function parseTeamCookie(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return clean(JSON.parse(decodeURIComponent(value)));
  } catch {
    try {
      return clean(decodeURIComponent(value).split(","));
    } catch {
      return [];
    }
  }
}

export function serializeTeam(names: string[]): string {
  return encodeURIComponent(JSON.stringify(clean(names)));
}

export function readDocumentTeam(): string[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie.split(/;\s*/).find((part) => part.startsWith(`${TEAM_COOKIE}=`));
  return parseTeamCookie(match?.slice(TEAM_COOKIE.length + 1));
}

export function readRequestTeam(): string[] {
  if (!isServer) return readDocumentTeam();
  const cookie = getRequestEvent()?.request.headers.get("cookie") ?? "";
  return parseTeamCookie(cookieValue(cookie, TEAM_COOKIE));
}

export function writeTeamCookie(names: string[]): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TEAM_COOKIE}=${serializeTeam(names)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
