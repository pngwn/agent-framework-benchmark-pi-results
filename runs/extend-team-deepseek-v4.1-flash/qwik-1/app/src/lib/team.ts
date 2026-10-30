// Team state helpers. The team lives in a browser cookie so the server can render
// the right state on the first paint, and client code can update it without a round trip.

export const TEAM_COOKIE = "team";
export const MAX_TEAM_SIZE = 6;

/** Remove duplicates, drop empty values and enforce the team limit. */
export function normalizeTeam(names: readonly string[]): string[] {
  const team: string[] = [];
  for (const name of names) {
    if (typeof name !== "string") continue;
    const value = name.trim();
    if (!value || team.includes(value)) continue;
    team.push(value);
    if (team.length === MAX_TEAM_SIZE) break;
  }
  return team;
}

/** Cookie values are decoded by the server before they reach this function. */
export function parseTeam(value: string | null | undefined): string[] {
  if (!value) return [];
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the raw value if it isn't valid percent-encoding.
  }
  return normalizeTeam(decoded.split(","));
}

export function serializeTeam(names: readonly string[]): string {
  return encodeURIComponent(normalizeTeam(names).join(","));
}

// Cookie attributes are repeated here rather than imported from a server-only module
// because this function runs in the browser.
export function saveTeamCookie(names: readonly string[]): void {
  if (typeof document === "undefined") return;
  const value = serializeTeam(names);
  document.cookie = value
    ? `${TEAM_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    : `${TEAM_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export interface TeamDamage {
  /** Damage multiplier for each attacking type, keyed by type API name. */
  damage: Record<string, number>;
}

export interface CoverageType {
  name: string;
  label: string;
}

export interface CoverageRow extends CoverageType {
  weak: number;
  resistant: number;
}

/** Count team members weak to and resistant to each attacking type. */
export function typeCoverage(members: readonly TeamDamage[], types: readonly CoverageType[]): CoverageRow[] {
  return types.map((type) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const multiplier = member.damage[type.name] ?? 1;
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { name: type.name, label: type.label, weak, resistant };
  });
}
