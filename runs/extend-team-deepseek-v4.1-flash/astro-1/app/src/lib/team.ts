import { api, apiPath } from './api';
import { MAX_SPECIES_ID, getTypeLabels, type Card } from './pokedex';

export const TEAM_COOKIE = 'team';
export const TEAM_SIZE = 6;

/** Reads the comma-separated species names from a cookie value, keeping order and removing duplicates. */
export function parseTeam(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of value.split(',')) {
    const name = raw.trim().toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= TEAM_SIZE) break;
  }
  return names;
}

export type TeamMember = Card & { types: { name: string; label: string }[] };

/**
 * Loads the species on a team in the order given, with the types of each species' default
 * Pokémon. Species the API no longer knows are dropped.
 */
export async function getTeamMembers(names: string[]): Promise<TeamMember[]> {
  const typeLabel = await getTypeLabels();
  const members = await Promise.all(
    names.map(async (name) => {
      const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
      if (!species || !(species.id < MAX_SPECIES_ID)) return null;

      const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
      const pokemon = variety ? await api(apiPath(variety.pokemon.url)) : null;
      if (!pokemon) return null;

      const types = [...(pokemon.types ?? [])]
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => ({ name: t.type.name, label: typeLabel(t.type.name) }));

      return { id: species.id, name: species.name, types } satisfies TeamMember;
    }),
  );

  return members.filter((member): member is TeamMember => member !== null);
}
