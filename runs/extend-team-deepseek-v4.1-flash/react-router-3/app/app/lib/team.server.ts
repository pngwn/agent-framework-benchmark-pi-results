// The team belongs to the browser: it is stored in a cookie so the server can render the
// correct state on the first response, and the order members were added in is preserved.
import { MAX_TEAM_SIZE } from "./team";

const COOKIE_NAME = "team";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Reads the team cookie, keeping only valid, unique names and at most six members. */
export function readTeam(request: Request): string[] {
  const header = request.headers.get("cookie");
  if (!header) return [];
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(rest.join("=")));
      if (!Array.isArray(parsed)) return [];
      const team: string[] = [];
      for (const value of parsed) {
        if (typeof value !== "string" || !value || team.includes(value)) continue;
        team.push(value);
        if (team.length === MAX_TEAM_SIZE) break;
      }
      return team;
    } catch {
      return [];
    }
  }
  return [];
}

export function addTeamMember(team: string[], species: string): string[] {
  if (!species || team.includes(species) || team.length >= MAX_TEAM_SIZE) return team;
  return [...team, species];
}

export function removeTeamMember(team: string[], species: string): string[] {
  return team.filter((name) => name !== species);
}

export function teamCookie(team: string[]): string {
  return `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(team))}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; HttpOnly`;
}
