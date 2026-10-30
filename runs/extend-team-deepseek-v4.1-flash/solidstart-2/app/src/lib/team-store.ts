export const TEAM_COOKIE = "team";
export const MAX_TEAM = 6;

/** Browser-stored team: up to six unique species API names, in the order they were added. */
export function parseTeamCookie(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let value = raw;
  if (value.startsWith("%")) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return [];
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value.split(",");
  }
  if (!Array.isArray(parsed)) return [];

  const names: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "string") continue;
    const name = entry.trim().toLowerCase();
    if (!name || names.includes(name)) continue;
    names.push(name);
    if (names.length === MAX_TEAM) break;
  }
  return names;
}

export function teamCookie(names: string[]): string {
  const value = encodeURIComponent(JSON.stringify(names.slice(0, MAX_TEAM)));
  return `${TEAM_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
