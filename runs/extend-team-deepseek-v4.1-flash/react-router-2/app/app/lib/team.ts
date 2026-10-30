import type { Card, TypeInfo } from "./types";

export const TEAM_COOKIE = "team";
export const MAX_TEAM_SIZE = 6;
const TEAM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Keeps API names in order, drops blanks and duplicates, and stops at six members. */
export function normalizeTeam(names: string[]): string[] {
  const team: string[] = [];
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name || team.includes(name)) continue;
    team.push(name);
    if (team.length === MAX_TEAM_SIZE) break;
  }
  return team;
}

/** The team stored in the request's cookie header. */
export function readTeamCookie(cookieHeader: string | null): string[] {
  for (const part of (cookieHeader ?? "").split(";")) {
    const equals = part.indexOf("=");
    if (equals === -1 || part.slice(0, equals).trim() !== TEAM_COOKIE) continue;
    try {
      return normalizeTeam(decodeURIComponent(part.slice(equals + 1)).split(","));
    } catch {
      return [];
    }
  }
  return [];
}

/** Persists the team in the browser for a year. Client-only. */
export function writeTeamCookie(team: string[]): void {
  document.cookie = `${TEAM_COOKIE}=${encodeURIComponent(
    normalizeTeam(team).join(","),
  )}; Path=/; Max-Age=${TEAM_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export type TypeRelation = {
  name: string;
  label: string;
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
};

export type CoverageRow = { name: string; label: string; weak: number; resistant: number };

function multiplier(relation: TypeRelation, defendingType: string): number {
  if (relation.noDamageTo.includes(defendingType)) return 0;
  if (relation.doubleDamageTo.includes(defendingType)) return 2;
  if (relation.halfDamageTo.includes(defendingType)) return 0.5;
  return 1;
}

/** Counts team members weak to and resistant to each attacking type. */
export function typeCoverage(
  members: { types?: TypeInfo[] }[],
  relations: TypeRelation[],
): CoverageRow[] {
  return relations.map((relation) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const damage = (member.types ?? []).reduce(
        (total, type) => total * multiplier(relation, type.name),
        1,
      );
      if (damage > 1) weak += 1;
      else if (damage < 1) resistant += 1;
    }
    return { name: relation.name, label: relation.label, weak, resistant };
  });
}

export type TeamMember = Card & { types: TypeInfo[] };

