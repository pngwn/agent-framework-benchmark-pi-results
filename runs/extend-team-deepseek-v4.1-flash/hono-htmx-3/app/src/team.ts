import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { api } from './api';
import { type Card, type TypeInfo, mainTypes, typeLabel } from './data';

export const TEAM_COOKIE = 'team';
export const TEAM_MAX = 6;

/** The species names in the browser's team, in the order they were added. */
export function readTeam(c: Context): string[] {
  const value = getCookie(c, TEAM_COOKIE);
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    try {
      parsed = JSON.parse(decodeURIComponent(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const team: string[] = [];
  const seen = new Set<string>();
  for (const name of parsed) {
    if (typeof name !== 'string' || !name || seen.has(name)) continue;
    seen.add(name);
    team.push(name);
    if (team.length === TEAM_MAX) break;
  }
  return team;
}

export function writeTeam(c: Context, team: string[]) {
  setCookie(c, TEAM_COOKIE, encodeURIComponent(JSON.stringify(team.slice(0, TEAM_MAX))), {
    path: '/',
    sameSite: 'Lax',
    maxAge: 365 * 24 * 60 * 60,
  });
}

export type TeamEntry = {
  name: string;
  types: { key: string; label: string }[];
};

export type CoverageRow = {
  type: string;
  label: string;
  weak: number;
  resistant: number;
};

export type TeamData = {
  members: TeamEntry[];
  cards: Card[];
  coverage: CoverageRow[];
};

/** Loads the picked species (and their main types) from the API in team order. */
export async function loadTeam(names: string[]): Promise<TeamData> {
  const [types, species] = await Promise.all([
    mainTypes(),
    Promise.all(names.map((name) => api(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`))),
  ]);
  const labels = new Map(types.map((t) => [t.name, t.label]));
  const pokemon = await Promise.all(species.map((s) => (s ? api(`pokemon/${s.id}`) : null)));

  const members: TeamEntry[] = [];
  const cards: Card[] = [];
  for (let i = 0; i < species.length; i++) {
    const s = species[i];
    const p = pokemon[i];
    if (!s || !p) continue;
    const memberTypes: TypeInfo[] = [...(p.types ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, label: typeLabel(labels, t.type.name) }));
    members.push({
      name: s.name,
      types: memberTypes.map((t) => ({ key: t.name, label: t.label })),
    });
    cards.push({ id: s.id as number, name: s.name as string, types: memberTypes });
  }

  // For each attacking type: the multiplier it applies to each defending type.
  const factors = new Map<string, Map<string, number>>();
  for (const t of types) {
    const relations = t.record.damage_relations ?? {};
    const byDefender = new Map<string, number>();
    for (const d of relations.no_damage_to ?? []) byDefender.set(d.name, 0);
    for (const d of relations.half_damage_to ?? []) byDefender.set(d.name, 0.5);
    for (const d of relations.double_damage_to ?? []) byDefender.set(d.name, 2);
    factors.set(t.name, byDefender);
  }

  const coverage: CoverageRow[] = types.map((attack) => {
    let weak = 0;
    let resistant = 0;
    const byDefender = factors.get(attack.name);
    for (const member of members) {
      let multiplier = 1;
      for (const defender of member.types) multiplier *= byDefender?.get(defender.key) ?? 1;
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { type: attack.name, label: attack.label, weak, resistant };
  });

  return { members, cards, coverage };
}
