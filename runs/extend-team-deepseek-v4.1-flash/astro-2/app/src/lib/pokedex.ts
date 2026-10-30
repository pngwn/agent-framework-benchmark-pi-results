import { api, apiPath, idFromUrl, API_BASE_URL } from './api';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const MAX_SPECIES_ID = 10000;

type Named = { name: string; url: string };
type Localized = { language: { name: string } };

export const humanize = (name: string) =>
  name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const englishName = (resource: { name: string; names?: ({ name: string } & Localized)[] }) =>
  resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);

export const cleanText = (text: string) => text.replace(/\s+/g, ' ').trim();

export function latestEnglishFlavorText(entries: ({ flavor_text: string } & Localized)[] = []): string | null {
  const en = entries.filter((e) => e.language.name === 'en');
  return en.length ? cleanText(en[en.length - 1].flavor_text) : null;
}

export function englishShortEffect(entries: ({ short_effect: string } & Localized)[] = []): string | null {
  const en = entries.find((e) => e.language.name === 'en');
  return en ? cleanText(en.short_effect) : null;
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;
export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
export const DASH = '—';

// ---------------------------------------------------------------------------------------
// Lists shared between pages

export type SpeciesRef = { id: number; name: string };

export async function getSpeciesList(): Promise<SpeciesRef[]> {
  const data = await api('pokemon-species/?limit=100000');
  return (data?.results ?? [])
    .map((r: Named) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((s: SpeciesRef) => s.id < MAX_SPECIES_ID)
    .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id);
}

export async function getSpeciesById(): Promise<Map<number, SpeciesRef>> {
  return new Map((await getSpeciesList()).map((s) => [s.id, s]));
}

export type TypeInfo = { id: number; name: string; label: string; record: any };

/** The 18 types, in API order, with their full records. */
export async function getTypes(): Promise<TypeInfo[]> {
  const data = await api('type/?limit=1000');
  const refs: Named[] = (data?.results ?? []).filter((r: Named) => !EXCLUDED_TYPES.has(r.name));
  const records = await Promise.all(refs.map((r) => api(apiPath(r.url))));
  return refs
    .map((r, i) => ({ id: idFromUrl(r.url), name: r.name, record: records[i] }))
    .filter((t) => t.record)
    .map((t) => ({ ...t, label: englishName(t.record) }));
}

/** English labels for any type name (falls back to the humanized name). */
export async function getTypeLabels(): Promise<(name: string) => string> {
  const types = await getTypes();
  const labels = new Map(types.map((t) => [t.name, t.label]));
  return (name) => labels.get(name) ?? humanize(name);
}

export type GenerationInfo = { name: string; label: string; species: Set<number> };

export async function getGenerations(): Promise<GenerationInfo[]> {
  const data = await api('generation/?limit=1000');
  const refs: Named[] = data?.results ?? [];
  const records = await Promise.all(refs.map((r) => api(apiPath(r.url))));
  return records
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      name: g.name,
      label: englishName(g),
      species: new Set<number>(g.pokemon_species.map((s: Named) => idFromUrl(s.url))),
    }));
}

// ---------------------------------------------------------------------------------------
// Pokémon cards

export type Card = {
  id: number;
  name: string;
  types?: { name: string; label: string }[];
  note?: string;
};

/**
 * Turns Pokémon references (from types, moves and abilities) into species cards: alternate
 * forms are dropped, each species appears once, ordered by dex number.
 */
export async function cardsForPokemon<T extends { pokemon: Named }>(
  refs: T[],
  note?: (ref: T) => string | undefined,
): Promise<Card[]> {
  const species = await getSpeciesById();
  const seen = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!(id < MAX_SPECIES_ID) || seen.has(id)) continue;
    const name = species.get(id)?.name ?? ref.pokemon.name;
    seen.set(id, { id, name, note: note?.(ref) });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

export type HomeEntry = Card & { generation?: string; types: { name: string; label: string }[] };

/** Every species with its default Pokémon's types (slot order) and generation. */
export async function getHomeEntries(): Promise<HomeEntry[]> {
  const [species, types, generations] = await Promise.all([getSpeciesList(), getTypes(), getGenerations()]);
  const typesById = new Map<number, { slot: number; name: string; label: string }[]>();
  for (const t of types) {
    for (const p of t.record.pokemon as { slot: number; pokemon: Named }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id < MAX_SPECIES_ID)) continue;
      let list = typesById.get(id);
      if (!list) typesById.set(id, (list = []));
      list.push({ slot: p.slot, name: t.name, label: t.label });
    }
  }
  const genById = new Map<number, string>();
  for (const g of generations) for (const id of g.species) genById.set(id, g.name);
  return species.map((s) => ({
    ...s,
    generation: genById.get(s.id),
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map(({ name, label }) => ({ name, label })),
  }));
}

/** Species cards for team members, in the order supplied, with their default forms' types. */
export async function getTeamMembers(names: string[]): Promise<Card[]> {
  const types = await getTypes();
  const labels = new Map(types.map((t) => [t.name, t.label]));

  const members = await Promise.all(
    names.map(async (name) => {
      const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
      if (!species || !(species.id < MAX_SPECIES_ID)) return null;
      const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
      const pokemon = await api(variety ? apiPath(variety.pokemon.url) : `pokemon/${species.id}`);
      if (!pokemon) return null;
      const memberTypes = [...pokemon.types]
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => ({ name: t.type.name, label: labels.get(t.type.name) ?? humanize(t.type.name) }));
      return { id: species.id, name: species.name, types: memberTypes } as Card;
    }),
  );

  return members.filter((member): member is Card => member !== null);
}

export type CoverageRow = { name: string; label: string; weak: number; resistant: number };

/** Counts how many team members are weak to or resist each attacking type. */
export function getTypeCoverage(types: TypeInfo[], members: Card[]): CoverageRow[] {
  const attackMultipliers = new Map<string, Map<string, number>>();
  for (const type of types) {
    const multipliers = new Map<string, number>();
    const relations = type.record.damage_relations ?? {};
    for (const t of relations.double_damage_to ?? []) multipliers.set(t.name, 2);
    for (const t of relations.half_damage_to ?? []) multipliers.set(t.name, 0.5);
    for (const t of relations.no_damage_to ?? []) multipliers.set(t.name, 0);
    attackMultipliers.set(type.name, multipliers);
  }

  return types.map((type) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let damage = 1;
      for (const memberType of member.types ?? []) {
        damage *= attackMultipliers.get(type.name)?.get(memberType.name) ?? 1;
      }
      if (damage > 1) weak++;
      else if (damage < 1) resistant++;
    }
    return { name: type.name, label: type.label, weak, resistant };
  });
}
