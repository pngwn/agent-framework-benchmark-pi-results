/** Cookie that stores the team as an ordered, comma-separated list of species names. */
export const TEAM_COOKIE = 'pokedex-team';

export const MAX_TEAM_SIZE = 6;

/** Parse the raw cookie value, dropping duplicates and anything beyond the team limit. */
export function parseTeamCookie(value: string | undefined): string[] {
  if (!value) return [];
  let raw = value;
  try {
    raw = decodeURIComponent(value);
  } catch {
    // Keep the raw value; an unreadable cookie is treated as an invalid entry below.
  }
  return [...new Set(raw.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_TEAM_SIZE);
}

export function teamCookieValue(team: string[]): string {
  return encodeURIComponent(team.join(','));
}

/** Read the team from `document.cookie` in the browser. */
export function readTeamCookie(): string[] {
  const prefix = `${TEAM_COOKIE}=`;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return parseTeamCookie(entry ? entry.slice(prefix.length) : undefined);
}

/** Persist the team to `document.cookie`, keeping it for a year. */
export function writeTeamCookie(team: string[]): void {
  document.cookie = `${TEAM_COOKIE}=${teamCookieValue(team)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
