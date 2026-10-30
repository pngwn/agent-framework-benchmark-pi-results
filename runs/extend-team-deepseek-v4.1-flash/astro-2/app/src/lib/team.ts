// The team lives in a cookie so the server can render exactly the state the browser has,
// with no flash of the wrong button label or an empty list before hydration.

export const TEAM_COOKIE = 'team';
export const MAX_TEAM_SIZE = 6;

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Keeps only valid-looking species names, in order, without duplicates or more than six. */
export function normaliseTeam(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const team: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = item.trim().toLowerCase();
    if (!name || name.length > 100 || !NAME_RE.test(name) || team.includes(name)) continue;
    team.push(name);
    if (team.length === MAX_TEAM_SIZE) break;
  }
  return team;
}

/** Reads the team cookie value. Astro may hand us either the raw or decoded value. */
export function parseTeamCookie(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return normaliseTeam(JSON.parse(decodeURIComponent(value)));
  } catch {}
  try {
    return normaliseTeam(JSON.parse(value));
  } catch {}
  return normaliseTeam(value.split(','));
}

export function getTeamFromCookies(cookies: { get(name: string): { value: string } | undefined }): string[] {
  return parseTeamCookie(cookies.get(TEAM_COOKIE)?.value);
}
