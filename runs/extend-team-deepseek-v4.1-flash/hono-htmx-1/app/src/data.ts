import { API_BASE_URL, api, apiList, idFromUrl } from './api';

type Named = { name: string; language: { name: string } };
type Ref = { name: string; url: string };

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const englishName = (resource: { names?: Named[]; name: string }) =>
  resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined) {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  return en.length ? en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim() : undefined;
}

export function englishEffect(entries: { short_effect: string; language: { name: string } }[] | undefined, chance?: number | null) {
  const effect = entries?.find((e) => e.language.name === 'en')?.short_effect;
  return effect?.replace(/\$effect_chance/g, String(chance ?? '')).replace(/\s+/g, ' ').trim();
}

export const MAX_SPECIES_POKEMON_ID = 10000;
export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

export type Species = { id: number; name: string };
export type TypeInfo = { name: string; label: string };

/** Every species, ordered by dex number. */
export async function allSpecies(): Promise<Species[]> {
  const list = await apiList('pokemon-species');
  return list.map((s) => ({ id: idFromUrl(s.url), name: s.name })).sort((a, b) => a.id - b.id);
}

export async function speciesById(): Promise<Map<number, Species>> {
  return new Map((await allSpecies()).map((s) => [s.id, s]));
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types with their full records, in API order. */
export async function mainTypes() {
  const list = (await apiList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(list.map((t) => api(`type/${t.name}`)));
  return records.filter(Boolean).map((t: any) => ({ name: t.name as string, label: englishName(t), record: t }));
}

/** type API name -> English name, for every type the API lists. */
export async function typeLabels(): Promise<Map<string, string>> {
  const types = await mainTypes();
  return new Map(types.map((t) => [t.name, t.label]));
}

export const typeLabel = (labels: Map<string, string>, name: string) => labels.get(name) ?? humanize(name);

/** species/pokemon ID -> its default Pokémon's types in slot order. */
export async function typesByPokemonId(types?: Awaited<ReturnType<typeof mainTypes>>): Promise<Map<number, TypeInfo[]>> {
  types ??= await mainTypes();
  const slots = new Map<number, { slot: number; type: TypeInfo }[]>();
  for (const t of types) {
    for (const p of t.record.pokemon as { slot: number; pokemon: Ref }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id < MAX_SPECIES_POKEMON_ID)) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id)!.push({ slot: p.slot, type: { name: t.name, label: t.label } });
    }
  }
  return new Map([...slots].map(([id, s]) => [id, s.sort((a, b) => a.slot - b.slot).map((x) => x.type)]));
}

export async function generations() {
  const list = await apiList('generation');
  const records = await Promise.all(list.map((g) => api(`generation/${g.name}`)));
  return records
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id)
    .map((g: any) => ({
      name: g.name as string,
      label: englishName(g),
      speciesIds: new Set<number>((g.pokemon_species as Ref[]).map((s) => idFromUrl(s.url))),
    }));
}

export type Card = Species & { types?: TypeInfo[]; note?: string };

/** Maps Pokémon references (type/move/ability data) to species cards, ordered by dex number. */
export async function cardsForPokemon<T extends { url: string }>(refs: T[], note?: (ref: T) => string | undefined): Promise<Card[]> {
  const species = await speciesById();
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!(id < MAX_SPECIES_POKEMON_ID) || seen.has(id)) continue;
    const s = species.get(id);
    if (!s) continue;
    seen.add(id);
    cards.push({ ...s, note: note?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}
