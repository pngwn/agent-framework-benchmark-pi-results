import { api, idFromUrl, isSpeciesId, mapLimit, tryApi } from './api.js';
import {
  englishGenus,
  englishName,
  englishShortEffect,
  humanize,
  latestEnglishFlavor,
  statLabel,
  typeLabel,
} from './format.js';
import type { PokemonCardData, TypeSummary } from './components.js';

export type SpeciesListItem = { id: number; name: string };
export type GenerationListItem = { id: number; name: string; label: string };

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export async function getSpeciesList(): Promise<SpeciesListItem[]> {
  const list = await api<any>('pokemon-species/?limit=100000');
  const seen = new Set<number>();
  const species: SpeciesListItem[] = [];
  for (const entry of list.results ?? []) {
    const id = idFromUrl(entry.url);
    if (!isSpeciesId(id) || seen.has(id)) continue;
    seen.add(id);
    species.push({ id, name: entry.name });
  }
  return species.sort((a, b) => a.id - b.id);
}

export async function getGenerations(): Promise<GenerationListItem[]> {
  const list = await api<any>('generation/?limit=1000');
  const results = list.results ?? [];
  const details = await mapLimit(results, 8, (entry: any) => api<any>(entry.url));
  return details
    .map((generation, index) => ({
      id: Number(generation.id ?? idFromUrl(results[index]?.url)),
      name: generation.name,
      label: englishName(generation.names, generation.name),
    }))
    .sort((a, b) => a.id - b.id);
}

export async function getTypes(): Promise<TypeSummary[]> {
  const list = await api<any>('type/?limit=1000');
  const names = (list.results ?? [])
    .map((entry: any) => entry.name)
    .filter((name: string) => !EXCLUDED_TYPES.has(name));
  const details = await mapLimit(names, 18, (name: string) => api<any>(`type/${name}/`));
  return details.map((type) => ({
    name: type.name,
    label: englishName(type.names, type.name),
  }));
}

export async function getType(name: string): Promise<any | null> {
  if (EXCLUDED_TYPES.has(name)) return null;
  return tryApi(`type/${name}/`);
}

export async function getPokemonCard(id: number, fallbackName?: string): Promise<PokemonCardData> {
  const pokemon = await api<any>(`pokemon/${id}/`);
  const speciesId = idFromUrl(pokemon.species?.url) || id;
  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => entry.type.name);
  return {
    id: speciesId,
    name: pokemon.species?.name ?? fallbackName ?? pokemon.name,
    sprite: pokemon.sprites?.front_default ?? null,
    types,
  };
}

export async function getPokemonCards(ids: number[]): Promise<PokemonCardData[]> {
  return mapLimit(ids, 40, (id) => getPokemonCard(id));
}

export async function getPokemonPageData(name: string) {
  const species = await tryApi<any>(`pokemon-species/${name}/`);
  if (!species) return null;

  const variety = (species.varieties ?? []).find((entry: any) => entry.is_default) ??
    (species.varieties ?? [])[0];
  const pokemonUrl = variety?.pokemon?.url ?? `pokemon/${species.id}/`;
  const pokemon = await api<any>(pokemonUrl);
  const evolutionChain = species.evolution_chain?.url
    ? await tryApi<any>(species.evolution_chain.url)
    : null;

  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({ name: entry.type.name, label: typeLabel(entry.type.name) }));

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    label: statLabel(entry.stat.name),
    value: Number(entry.base_stat),
  }));
  const total = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    '';
  const english = englishName(species.names, species.name);

  return {
    species,
    pokemon,
    englishName: english,
    genus: englishGenus(species.genera),
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    dexId: Number(species.id),
    artwork,
    artworkAlt: english,
    height: (Number(pokemon.height) / 10).toFixed(1),
    weight: (Number(pokemon.weight) / 10).toFixed(1),
    types,
    abilities,
    stats,
    total,
    evolution: evolutionChain?.chain ? evolutionTree(evolutionChain.chain) : [],
    moveSection: await getMoveSectionData(pokemon),
  };
}

export async function getMove(name: string): Promise<any | null> {
  return tryApi(`move/${name}/`);
}

export async function getAbility(name: string): Promise<any | null> {
  return tryApi(`ability/${name}/`);
}

export async function getMovePageData(name: string) {
  const move = await getMove(name);
  if (!move) return null;
  const effect = englishShortEffect(move.effect_entries) || latestEnglishFlavor(move.flavor_text_entries) || '—';
  const ids = [
    ...new Set(
      (move.learned_by_pokemon ?? [])
        .map((entry: any) => idFromUrl(entry.url))
        .filter((id: number) => isSpeciesId(id)),
    ),
  ].sort((a, b) => a - b);
  return {
    move,
    title: englishName(move.names, move.name),
    typeName: move.type?.name ?? '',
    typeLabel: typeLabel(move.type?.name ?? ''),
    category: humanize(move.damage_class?.name ?? ''),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    cards: await getPokemonCards(ids),
  };
}

export async function getAbilityPage(name: string) {
  const ability = await api<any>(`ability/${name}/`);
  const hidden = new Map<number, boolean>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!isSpeciesId(id)) continue;
    hidden.set(id, Boolean(hidden.get(id) || entry.is_hidden));
  }
  const ids = [...hidden.keys()].sort((a, b) => a - b);
  const cards = await mapLimit(ids, 20, async (id) => ({
    ...(await getPokemonCard(id)),
    hidden: hidden.get(id) === true,
  }));
  return {
    ability,
    title: englishName(ability.names, ability.name),
    effect: englishShortEffect(ability.effect_entries) || '—',
    cards,
  };
}

export async function getTypePage(name: string) {
  const type = await getType(name);
  if (!type) return null;

  const pokemonIds = [
    ...new Set(
      (type.pokemon ?? [])
        .map((entry: any) => idFromUrl(entry.pokemon?.url))
        .filter((id: number) => isSpeciesId(id)),
    ),
  ].sort((a, b) => a - b);

  const moves = (type.moves ?? [])
    .map((entry: any) => ({ name: entry.name, label: humanize(entry.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const relationDefinitions: [string, string][] = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ];
  const relations = relationDefinitions.map(([label, key]) => ({
    label,
    types: ((type.damage_relations?.[key] ?? []) as any[]).map((entry: any) => ({
      name: entry.name,
      label: typeLabel(entry.name),
    })),
  }));

  return {
    type,
    title: englishName(type.names, type.name),
    relations,
    cards: await getPokemonCards(pokemonIds),
    moves,
  };
}

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] };

export function evolutionTree(chain: any): EvolutionNode[] {
  return [toEvolutionNode(chain)];
}

function toEvolutionNode(node: any): EvolutionNode {
  const name = node?.species?.name ?? '';
  return {
    name,
    label: humanize(name),
    children: (node?.evolves_to ?? []).map(toEvolutionNode),
  };
}

export type VersionGroupInfo = { name: string; label: string; order: number };

export async function getMoveSectionData(pokemon: any) {
  const versionGroupMap = new Map<string, { name: string; url: string }>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      const ref = detail.version_group;
      if (ref?.name) versionGroupMap.set(ref.name, ref);
    }
  }

  const versionGroups = await mapLimit([...versionGroupMap.values()], 20, async (ref) => {
    const detail = await tryApi<any>(ref.url);
    return {
      name: ref.name,
      label: englishName(detail?.names, ref.name),
      order: Number(detail?.order ?? idFromUrl(ref.url) ?? 0),
    };
  });
  versionGroups.sort((a, b) => a.order - b.order);

  return {
    versionGroups,
    defaultGame: versionGroups.at(-1)?.name ?? '',
  };
}

export async function getMoveDetailsForGame(pokemon: any, game: string) {
  const names = new Set<string>();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name === game) names.add(moveEntry.move.name);
    }
  }
  const details = await mapLimit([...names], 40, async (name) => {
    const move = await tryApi<any>(`move/${name}/`);
    return [name, move] as const;
  });
  return new Map(details.filter((entry): entry is [string, any] => Boolean(entry[1])));
}

export function buildMoveTables(pokemon: any, moveDetails: Map<string, any>, selectedGame: string) {
  const rows: any[] = [];
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name !== selectedGame) continue;
      const move = moveDetails.get(moveEntry.move.name);
      if (!move) continue;
      const method = detail.move_learn_method?.name ?? 'other';
      rows.push({
        method,
        methodLabel: humanize(method),
        level: Number(detail.level_learned_at ?? 0),
        moveName: move.name,
        moveLabel: englishName(move.names, move.name),
        typeName: move.type?.name ?? '',
        typeLabel: typeLabel(move.type?.name ?? ''),
        category: humanize(move.damage_class?.name ?? ''),
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      });
    }
  }

  const methods = new Map<string, any[]>();
  for (const row of rows) {
    if (!methods.has(row.method)) methods.set(row.method, []);
    methods.get(row.method)!.push(row);
  }

  const fixed = ['level-up', 'machine', 'egg', 'tutor'];
  const methodNames = [...methods.keys()].sort((a, b) => {
    const ai = fixed.indexOf(a);
    const bi = fixed.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return humanize(a).localeCompare(humanize(b));
  });

  return methodNames.map((method) => {
    const methodRows = methods.get(method)!;
    methodRows.sort((a, b) => {
      if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
      return a.moveLabel.localeCompare(b.moveLabel);
    });
    return {
      method,
      label: humanize(method),
      hasLevel: method === 'level-up',
      rows: methodRows,
    };
  });
}

export async function getGenerationSpeciesIds(name: string): Promise<Set<number> | null> {
  const generation = await tryApi<any>(`generation/${name}/`);
  if (!generation) return null;
  return new Set(
    (generation.pokemon_species ?? [])
      .map((entry: any) => idFromUrl(entry.url))
      .filter((id: number) => isSpeciesId(id)),
  );
}
