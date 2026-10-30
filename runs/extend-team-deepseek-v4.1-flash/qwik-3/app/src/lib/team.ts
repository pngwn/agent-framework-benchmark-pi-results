// Team state helpers. The team lives in a cookie so server-rendered pages can
// reflect it immediately, with the browser as the only source of truth.

export const TEAM_COOKIE = "team";
export const MAX_TEAM = 6;

const VALID_NAME = /^[a-z0-9-]+$/i;

/** Read a team cookie value into a clean, ordered list of species names. */
export function parseTeam(value: string | null | undefined): string[] {
  const names: string[] = [];
  for (const part of (value ?? "").split(",")) {
    let name = part.trim().toLowerCase();
    try {
      name = decodeURIComponent(name);
    } catch {
      // Leave malformed escapes as they came in; they fail validation below.
    }
    if (!VALID_NAME.test(name) || names.includes(name)) continue;
    names.push(name);
    if (names.length >= MAX_TEAM) break;
  }
  return names;
}

export const serializeTeam = (names: string[]) => names.slice(0, MAX_TEAM).map(encodeURIComponent).join(",");

/** Persist the team in the browser. Only ever called from client code. */
export function writeTeamCookie(names: string[]) {
  document.cookie = `${TEAM_COOKIE}=${serializeTeam(names)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function addTeamMember(names: string[], name: string): string[] {
  if (names.includes(name) || names.length >= MAX_TEAM) return names;
  return [...names, name];
}

export function removeTeamMember(names: string[], name: string): string[] {
  return names.filter((n) => n !== name);
}

export interface AttackType {
  name: string;
  label: string;
  double: string[];
  half: string[];
  none: string[];
}

export interface CoverageRow {
  name: string;
  label: string;
  weak: number;
  resistant: number;
}

interface CoverageCard {
  types: { name: string }[];
}

/** Damage a type does to one Pokémon, using its types in slot order. */
function damageMultiplier(attack: AttackType, types: { name: string }[]): number {
  return types.reduce((product, type) => {
    if (attack.none.includes(type.name)) return 0;
    if (attack.double.includes(type.name)) return product * 2;
    if (attack.half.includes(type.name)) return product * 0.5;
    return product;
  }, 1);
}

/** One row per attacking type, in API order. */
export function computeCoverage(cards: CoverageCard[], attacks: AttackType[]): CoverageRow[] {
  return attacks.map((attack) => {
    let weak = 0;
    let resistant = 0;
    for (const card of cards) {
      const multiplier = damageMultiplier(attack, card.types);
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { name: attack.name, label: attack.label, weak, resistant };
  });
}
