// Team state shared by the server and the browser. The team is stored in a
// first-party cookie so the server can render it correctly on the first paint.

export const TEAM_COOKIE = "team";
export const TEAM_SIZE = 6;

const VALID_NAME = /^[a-z0-9-]+$/i;

/** Keep only valid, unique species names, preserving order, and cap the team size. */
export function normalizeTeam(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const team: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim().toLowerCase();
    if (!VALID_NAME.test(name) || team.includes(name)) continue;
    team.push(name);
    if (team.length === TEAM_SIZE) break;
  }
  return team;
}

/** Parse a cookie value. Encoded JSON is preferred; plain comma-separated names also work. */
export function parseTeamCookie(value: string | null | undefined): string[] {
  if (!value) return [];
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the original value when it isn't percent-encoded.
  }
  try {
    return normalizeTeam(JSON.parse(decoded));
  } catch {
    return normalizeTeam(decoded.split(","));
  }
}

export const teamCookieValue = (team: string[]) => encodeURIComponent(JSON.stringify(normalizeTeam(team)));

/** Read the team cookie in the browser. */
export function readTeamCookie(): string[] {
  if (typeof document === "undefined") return [];
  const prefix = `${TEAM_COOKIE}=`;
  for (const part of document.cookie.split(";")) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) return parseTeamCookie(entry.slice(prefix.length));
  }
  return [];
}

/** Write the team cookie in the browser. */
export function writeTeamCookie(team: string[]) {
  if (typeof document === "undefined") return;
  document.cookie = `${TEAM_COOKIE}=${teamCookieValue(team)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export interface CoverageType {
  name: string;
}

export interface TypeRelations {
  name: string;
  label: string;
  double: string[];
  half: string[];
  no: string[];
}

export interface CoverageRow {
  name: string;
  label: string;
  weak: number;
  resistant: number;
}

const multiplier = (attacking: TypeRelations, defending: string) => {
  if (attacking.no.includes(defending)) return 0;
  if (attacking.half.includes(defending)) return 0.5;
  if (attacking.double.includes(defending)) return 2;
  return 1;
};

/** Count team members weak to or resistant to each attacking type. */
export function coverageRows(
  members: { types: CoverageType[] }[],
  relations: TypeRelations[],
): CoverageRow[] {
  return relations.map((attacking) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let damage = 1;
      for (const defending of member.types) damage *= multiplier(attacking, defending.name);
      if (damage > 1) weak++;
      else if (damage < 1) resistant++;
    }
    return { name: attacking.name, label: attacking.label, weak, resistant };
  });
}
