import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { api } from './api';
import { type Card, type TypeInfo, mainTypes, typesByPokemonId } from './data';

export const TEAM_SIZE = 6;

const TEAM_COOKIE = 'team';

/** The species names on the visitor's team, in the order they were added. */
export function teamFromCookie(c: Context): string[] {
  const raw = getCookie(c, TEAM_COOKIE);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const names = parsed.filter((name): name is string => typeof name === 'string' && name.length > 0);
    return [...new Set(names)].slice(0, TEAM_SIZE);
  } catch {
    return [];
  }
}

export function saveTeam(c: Context, names: string[]) {
  setCookie(c, TEAM_COOKIE, JSON.stringify(names.slice(0, TEAM_SIZE)), {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export type TeamMember = Card & { types: TypeInfo[] };

/** Loads team members from the API, preserving their saved order. */
export async function loadTeam(names: string[]): Promise<TeamMember[]> {
  if (names.length === 0) return [];
  const [species, typesById] = await Promise.all([
    Promise.all(names.map((name) => api(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`))),
    typesByPokemonId(),
  ]);
  return species.flatMap((s) =>
    s ? [{ id: s.id as number, name: s.name as string, types: typesById.get(s.id) ?? [] }] : [],
  );
}

type DamageRelations = {
  double_damage_to?: { name: string }[];
  half_damage_to?: { name: string }[];
  no_damage_to?: { name: string }[];
};

const multiplierFor = (relations: DamageRelations, type: string) => {
  if (relations.double_damage_to?.some((t) => t.name === type)) return 2;
  if (relations.half_damage_to?.some((t) => t.name === type)) return 0.5;
  if (relations.no_damage_to?.some((t) => t.name === type)) return 0;
  return 1;
};

export type CoverageRow = { name: string; label: string; weak: number; resistant: number };

/** How many team members are weak to or resist each attacking type. */
export async function loadCoverage(members: TeamMember[]): Promise<CoverageRow[]> {
  if (members.length === 0) return [];
  const types = await mainTypes();
  return types.map((attacking) => {
    const relations = attacking.record.damage_relations as DamageRelations;
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const multiplier = member.types.reduce((product, type) => product * multiplierFor(relations, type.name), 1);
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { name: attacking.name, label: attacking.label, weak, resistant };
  });
}
