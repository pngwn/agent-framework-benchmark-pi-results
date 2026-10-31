import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Catalog, CatalogService, PokemonCardData, pokemonRefsToCards, TypeRef } from './catalog.service';
import { PokeApi } from './pokeapi.service';
import {
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  LocalizedName,
  NamedResource,
  orDash,
} from './util';

interface SpeciesResource {
  id: number;
  name: string;
  names?: LocalizedName[];
  genera?: { genus: string; language: NamedResource }[];
  flavor_text_entries?: { flavor_text: string; language: NamedResource }[];
  evolution_chain: { url: string };
  varieties: { is_default: boolean; pokemon: NamedResource }[];
}

interface PokemonResource {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedResource }[];
  stats: { base_stat: number; stat: NamedResource }[];
  sprites: { other?: { ['official-artwork']?: { front_default: string | null } } };
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedResource;
      move_learn_method: NamedResource;
    }[];
  }[];
}

interface MoveResource {
  id: number;
  name: string;
  names?: LocalizedName[];
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: NamedResource;
  damage_class: NamedResource | null;
  effect_entries?: { effect: string; short_effect: string; language: NamedResource }[];
  flavor_text_entries?: { flavor_text: string; language: NamedResource }[];
  learned_by_pokemon: NamedResource[];
}

interface AbilityResource {
  id: number;
  name: string;
  names?: LocalizedName[];
  effect_entries?: { effect: string; short_effect: string; language: NamedResource }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedResource }[];
}

interface TypeResource {
  id: number;
  name: string;
  names?: LocalizedName[];
  damage_relations: Record<string, NamedResource[]>;
  pokemon: { slot: number; pokemon: NamedResource }[];
  moves: NamedResource[];
}

interface EvolutionChainResource {
  chain: {
    species: NamedResource;
    evolves_to: EvolutionChainResource['chain'][];
  };
}

interface VersionGroupResource {
  name: string;
  order: number;
}

// ---------------------------------------------------------------- home

export const homeResolver: ResolveFn<Catalog> = () => inject(CatalogService).catalog();

// ---------------------------------------------------------------- pokemon

export interface EvoNode {
  name: string;
  humanName: string;
  children: EvoNode[];
}

export interface MoveRow {
  level: number | null;
  /** English move name */
  name: string;
  /** move API name (used in the link) */
  apiName: string;
  type: TypeRef;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string;
  methodLabel: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

export interface PokemonPageData {
  englishName: string;
  id: number;
  genus: string | null;
  flavor: string | null;
  types: TypeRef[];
  height: string;
  weight: string;
  artwork: string | null;
  stats: { label: string; value: number }[];
  total: number;
  abilities: { name: string; humanName: string; hidden: boolean }[];
  evolution: EvoNode;
  games: { name: string; label: string }[];
  selectedGame: string | null;
  tables: MoveTableData[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

/** Learn method tables appear in this order, then any others alphabetically. */
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function typeRef(name: string, catalog: Catalog): TypeRef {
  return { name, english: catalog.typeEnglishByName.get(name) ?? humanize(name) };
}

export const pokemonResolver: ResolveFn<PokemonPageData | null> = async (route) => {
  const api = inject(PokeApi);
  const catalogService = inject(CatalogService);
  const name = (route.paramMap.get('name') ?? '').toLowerCase();

  let species: SpeciesResource;
  try {
    species = await api.get<SpeciesResource>(`pokemon-species/${name}`);
  } catch {
    return null;
  }

  const catalog = await catalogService.catalog();
  const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const [pokemon, evolutionChain] = await Promise.all([
    api.get<PokemonResource>(`pokemon/${idFromUrl(defaultVariety.pokemon.url)}`),
    api.get<EvolutionChainResource>(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`),
  ]);

  // Version groups in which this Pokémon learns moves, ordered by their order.
  const versionGroupNames = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const versionGroups = (
    await Promise.all(versionGroupNames.map((n) => api.get<VersionGroupResource>(`version-group/${n}`)))
  ).sort((a, b) => a.order - b.order);

  const requestedGame = route.queryParamMap.get('game');
  const selectedGame = versionGroups.some((g) => g.name === requestedGame)
    ? requestedGame!
    : (versionGroups[versionGroups.length - 1]?.name ?? null);

  // Moves for the selected game, grouped by learn method.
  const levelByMethodMove = new Map<string, Map<string, number[]>>();
  const moveNames = new Set<string>();
  if (selectedGame) {
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== selectedGame) continue;
        const method = d.move_learn_method.name;
        moveNames.add(m.move.name);
        const byMove = levelByMethodMove.get(method) ?? new Map<string, number[]>();
        const levels = byMove.get(m.move.name) ?? [];
        levels.push(d.level_learned_at);
        byMove.set(m.move.name, levels);
        levelByMethodMove.set(method, byMove);
      }
    }
  }
  const moveResources = new Map(
    (await Promise.all([...moveNames].map((n) => api.get<MoveResource>(`move/${n}`)))).map((m) => [m.name, m]),
  );

  const methodNames = [...levelByMethodMove.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables: MoveTableData[] = methodNames.map((method) => {
    const byMove = levelByMethodMove.get(method)!;
    const rows: MoveRow[] = [];
    for (const [moveName, levels] of byMove) {
      const move = moveResources.get(moveName)!;
      for (const level of levels) {
        rows.push({
          level: method === 'level-up' ? level : null,
          name: englishName(move),
          apiName: move.name,
          type: typeRef(move.type.name, catalog),
          category: move.damage_class ? humanize(move.damage_class.name) : '—',
          power: move.power,
          accuracy: move.accuracy,
          pp: move.pp,
        });
      }
    }
    rows.sort((a, b) =>
      method === 'level-up'
        ? (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
    return { method, methodLabel: humanize(method), hasLevel: method === 'level-up', rows };
  });

  const stats = pokemon.stats.map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  const toEvoNode = (chain: EvolutionChainResource['chain']): EvoNode => ({
    name: chain.species.name,
    humanName: humanize(chain.species.name),
    children: chain.evolves_to.map(toEvoNode),
  });

  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => typeRef(t.type.name, catalog));

  const artwork =
    pokemon.sprites.other?.['official-artwork']?.front_default ??
    api.media(`sprites/pokemon/other/official-artwork/${pokemon.id}.png`);

  return {
    englishName: englishName(species),
    id: species.id,
    genus: species.genera?.find((g) => g.language.name === 'en')?.genus ?? null,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    types,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    artwork,
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, humanName: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: toEvoNode(evolutionChain.chain),
    games: versionGroups.map((g) => ({ name: g.name, label: humanize(g.name) })),
    selectedGame,
    tables,
  };
};

// ---------------------------------------------------------------- move

export interface MovePageData {
  englishName: string;
  type: TypeRef;
  category: string;
  power: string;
  accuracy: string;
  pp: string;
  effect: string;
  learned: PokemonCardData[];
}

export const moveResolver: ResolveFn<MovePageData | null> = async (route) => {
  const api = inject(PokeApi);
  const catalogService = inject(CatalogService);
  const name = (route.paramMap.get('name') ?? '').toLowerCase();

  let move: MoveResource;
  try {
    move = await api.get<MoveResource>(`move/${name}`);
  } catch {
    return null;
  }

  const catalog = await catalogService.catalog();
  const effect =
    move.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    '—';

  return {
    englishName: englishName(move),
    type: typeRef(move.type.name, catalog),
    category: move.damage_class ? humanize(move.damage_class.name) : '—',
    power: orDash(move.power),
    accuracy: orDash(move.accuracy),
    pp: orDash(move.pp),
    effect,
    learned: pokemonRefsToCards(move.learned_by_pokemon, catalog),
  };
};

// ---------------------------------------------------------------- ability

export interface AbilityPageData {
  englishName: string;
  effect: string;
  pokemon: PokemonCardData[];
}

export const abilityResolver: ResolveFn<AbilityPageData | null> = async (route) => {
  const api = inject(PokeApi);
  const catalogService = inject(CatalogService);
  const name = (route.paramMap.get('name') ?? '').toLowerCase();

  let ability: AbilityResource;
  try {
    ability = await api.get<AbilityResource>(`ability/${name}`);
  } catch {
    return null;
  }

  const catalog = await catalogService.catalog();
  return {
    englishName: englishName(ability),
    effect: ability.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ?? '—',
    pokemon: pokemonRefsToCards(
      ability.pokemon.map((p) => p.pokemon),
      catalog,
      (pokemonName) => {
        const entries = ability.pokemon.filter((p) => p.pokemon.name === pokemonName);
        return { hidden: entries.some((p) => p.is_hidden) };
      },
    ),
  };
};

// ---------------------------------------------------------------- types

export const typesResolver: ResolveFn<Catalog> = () => inject(CatalogService).catalog();

export interface TypePageData {
  englishName: string;
  relations: { term: string; types: TypeRef[] }[];
  pokemon: PokemonCardData[];
  moves: { name: string; humanName: string }[];
}

const RELATION_TERMS: [string, string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export const typeResolver: ResolveFn<TypePageData | null> = async (route) => {
  const api = inject(PokeApi);
  const catalogService = inject(CatalogService);
  const name = (route.paramMap.get('name') ?? '').toLowerCase();

  let type: TypeResource;
  try {
    type = await api.get<TypeResource>(`type/${name}`);
  } catch {
    return null;
  }

  const catalog = await catalogService.catalog();
  return {
    englishName: englishName(type),
    relations: RELATION_TERMS.map(([key, term]) => ({
      term,
      types: (type.damage_relations[key] ?? []).map((t) => typeRef(t.name, catalog)),
    })),
    pokemon: pokemonRefsToCards(
      type.pokemon.map((p) => p.pokemon),
      catalog,
    ),
    moves: type.moves
      .map((m) => ({ name: m.name, humanName: humanize(m.name) }))
      .sort((a, b) => a.humanName.localeCompare(b.humanName)),
  };
};
