import type { AstroCookies } from 'astro';

// The team lives in a first-party cookie, so the server can render it on every request.
// It is a list of species names in the order they were added.
export const TEAM_COOKIE = 'team';
export const MAX_TEAM = 6;

const SPECIES_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ONE_YEAR = 60 * 60 * 24 * 365;

function normalize(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const team: string[] = [];
  for (const name of value) {
    if (typeof name !== 'string' || !SPECIES_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    team.push(name);
    if (team.length === MAX_TEAM) break;
  }
  return team;
}

export function readTeam(cookies: AstroCookies): string[] {
  const raw = cookies.get(TEAM_COOKIE)?.value;
  if (!raw) return [];
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeTeam(cookies: AstroCookies, team: string[]) {
  if (team.length === 0) {
    cookies.delete(TEAM_COOKIE, { path: '/' });
    return;
  }
  cookies.set(TEAM_COOKIE, JSON.stringify(team), {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
  });
}

export function addToTeam(cookies: AstroCookies, name: string): string[] {
  const team = readTeam(cookies);
  if (!SPECIES_NAME.test(name) || team.includes(name) || team.length >= MAX_TEAM) return team;
  const next = [...team, name];
  writeTeam(cookies, next);
  return next;
}

export function removeFromTeam(cookies: AstroCookies, name: string): string[] {
  const team = readTeam(cookies);
  if (!team.includes(name)) return team;
  const next = team.filter((entry) => entry !== name);
  writeTeam(cookies, next);
  return next;
}
