import { apiFetch, idFromUrl, spriteUrl } from './api';
import { englishName, humanize } from './format';

export interface TypeInfo {
  id: number;
  name: string;
  en: string;
  record: any;
}

export interface GenerationInfo {
  id: number;
  name: string;
  en: string;
  record: any;
}

export interface SpeciesRef {
  id: number;
  name: string;
}

/** The 18 types, in API order. */
export async function getTypes(): Promise<TypeInfo[]> {
  const list = await apiFetch('/type/?limit=100');
  const excluded = new Set(['stellar', 'unknown', 'shadow']);
  const refs = list.results.filter((r: any) => !excluded.has(r.name));
  const records = await Promise.all(refs.map((r: any) => apiFetch(`/type/${r.name}/`)));
  return records
    .filter(Boolean)
    .map((t: any) => ({
      id: t.id,
      name: t.name,
      en: englishName(t.names) ?? humanize(t.name),
      record: t,
    }))
    .sort((a, b) => a.id - b.id);
}

/** The nine generations, in API order. */
export async function getGenerations(): Promise<GenerationInfo[]> {
  const list = await apiFetch('/generation/?limit=100');
  const records = await Promise.all(
    list.results.map((r: any) => apiFetch(`/generation/${r.name}/`)),
  );
  return records
    .filter(Boolean)
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      en: englishName(g.names) ?? humanize(g.name),
      record: g,
    }))
    .sort((a, b) => a.id - b.id);
}

/** Every species the API lists, ordered by dex number. */
export async function getSpecies(): Promise<SpeciesRef[]> {
  const list = await apiFetch('/pokemon-species/?limit=5000');
  return list.results
    .map((r: any) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((s: SpeciesRef) => Number.isFinite(s.id))
    .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id);
}

export interface CardData {
  id: number;
  speciesName: string;
  human: string;
  sprite: string;
  hidden: boolean;
}

/**
 * Map Pokémon references (from move/ability/type data, which refers to
 * Pokémon rather than species) to species cards. Alternate forms (Pokémon
 * IDs above 10000) are excluded; a species' default Pokémon has the same ID
 * as the species, so the mapping is a direct lookup for everything else.
 */
export async function cardsForPokemonRefs(
  refs: Array<{ name: string; url: string }>,
  hiddenOf?: (ref: { name: string; url: string }) => boolean,
): Promise<CardData[]> {
  const species = await getSpecies();
  const byId = new Map(species.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const pokemonId = idFromUrl(ref.url);
    if (!Number.isFinite(pokemonId) || pokemonId >= 10000) continue;
    let sp = byId.get(pokemonId);
    if (!sp) {
      // Defensive fallback: resolve through the Pokémon record.
      const rec = await apiFetch(`/pokemon/${pokemonId}/`);
      if (!rec) continue;
      sp = { id: idFromUrl(rec.species.url), name: rec.species.name };
    }
    if (seen.has(sp.id)) continue;
    seen.add(sp.id);
    cards.push({
      id: sp.id,
      speciesName: sp.name,
      human: humanize(sp.name),
      sprite: spriteUrl(pokemonId),
      hidden: hiddenOf?.(ref) ?? false,
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}
