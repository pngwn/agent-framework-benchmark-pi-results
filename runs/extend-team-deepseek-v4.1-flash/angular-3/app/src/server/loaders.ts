/**
 * Builds the view models for each page from live PokeAPI data. Runs on the server only:
 * the browser receives the compact view models, never the (large) raw API documents.
 */
import { humanize } from '../app/shared/format';
import type {
  AbilityVM,
  Card,
  EvolutionNode,
  HomeVM,
  MoveRow,
  MoveTableVM,
  MoveVM,
  NamedRef,
  PokemonVM,
  TeamVM,
  TypesVM,
  TypeVM,
} from '../app/shared/models';
import { apiFind, apiGet, idFromUrl } from './api-client';

// --- Raw API shapes (only the fields we use) ---

interface ApiRef {
  name: string;
  url: string;
}
interface ApiList {
  results: ApiRef[];
}
interface ApiName {
  name: string;
  language: ApiRef;
}
interface ApiFlavorText {
  flavor_text: string;
  language: ApiRef;
}
interface ApiEffectEntry {
  short_effect: string;
  language: ApiRef;
}
interface ApiType {
  id: number;
  name: string;
  names: ApiName[];
  damage_relations: Record<string, ApiRef[]>;
  pokemon: { slot: number; pokemon: ApiRef }[];
  moves: ApiRef[];
}
interface ApiGeneration {
  name: string;
  names: ApiName[];
  pokemon_species: ApiRef[];
}
interface ApiSpecies {
  id: number;
  name: string;
  names: ApiName[];
  genera: { genus: string; language: ApiRef }[];
  flavor_text_entries: ApiFlavorText[];
  evolution_chain: { url: string } | null;
}
interface ApiPokemon {
  id: number;
  height: number;
  weight: number;
  types: { slot: number; type: ApiRef }[];
  abilities: { slot: number; is_hidden: boolean; ability: ApiRef }[];
  stats: { base_stat: number; stat: ApiRef }[];
  sprites: { other?: Record<string, { front_default: string | null } | undefined> };
  moves: {
    move: ApiRef;
    version_group_details: { level_learned_at: number; version_group: ApiRef; move_learn_method: ApiRef }[];
  }[];
}
interface ApiChainLink {
  species: ApiRef;
  evolves_to: ApiChainLink[];
}
interface ApiEvolutionChain {
  chain: ApiChainLink;
}
interface ApiVersionGroup {
  name: string;
  order: number;
}
interface ApiMove {
  name: string;
  names: ApiName[];
  type: ApiRef | null;
  damage_class: ApiRef | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_chance: number | null;
  effect_entries: ApiEffectEntry[];
  flavor_text_entries: ApiFlavorText[];
  learned_by_pokemon: ApiRef[];
}
interface ApiAbility {
  name: string;
  names: ApiName[];
  effect_entries: ApiEffectEntry[];
  flavor_text_entries: ApiFlavorText[];
  pokemon: { is_hidden: boolean; pokemon: ApiRef }[];
}

// --- Helpers ---

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const ALTERNATE_FORM_MIN_ID = 10000;
const ALL = '?limit=100000';

const isEnglish = (entry: { language: ApiRef }) => entry.language.name === 'en';

function englishName(names: ApiName[], fallback: string): string {
  return names.find(isEnglish)?.name ?? humanize(fallback);
}

function latestFlavorText(entries: ApiFlavorText[]): string | null {
  const english = entries.filter(isEnglish);
  const text = english[english.length - 1]?.flavor_text;
  return text ? collapse(text) : null;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function shortEffect(entries: ApiEffectEntry[], chance: number | null = null): string | null {
  const text = entries.find(isEnglish)?.short_effect;
  if (!text) return null;
  return collapse(chance === null ? text : text.replaceAll('$effect_chance', String(chance)));
}

/** Species id → species name, for every species the API lists. */
async function speciesNames(): Promise<Map<number, string>> {
  const list = await apiGet<ApiList>(`pokemon-species/${ALL}`);
  return new Map(list.results.map((r) => [idFromUrl(r.url), r.name]));
}

/** The 18 types, in API order, with their full documents. */
async function allTypes(): Promise<ApiType[]> {
  const list = await apiGet<ApiList>(`type/${ALL}`);
  const refs = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name));
  return Promise.all(refs.map((r) => apiGet<ApiType>(r.url)));
}

async function typeLabels(): Promise<Map<string, string>> {
  const types = await allTypes();
  return new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

function typeRef(name: string, labels: Map<string, string>): NamedRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/** Pokémon references → species cards, without alternate forms, ordered by dex number. */
function toCards(refs: { ref: ApiRef; hidden?: boolean }[], species: Map<number, string>): Card[] {
  const cards = new Map<number, Card>();
  for (const { ref, hidden } of refs) {
    const id = idFromUrl(ref.url);
    if (!(id < ALTERNATE_FORM_MIN_ID) || cards.has(id)) continue;
    const card: Card = { id, name: species.get(id) ?? ref.name };
    if (hidden !== undefined) card.hidden = hidden;
    cards.set(id, card);
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function attackMultiplier(attacking: ApiType, defending: string): number {
  const relations = attacking.damage_relations;
  if ((relations['no_damage_to'] ?? []).some((relation) => relation.name === defending)) return 0;
  if ((relations['double_damage_to'] ?? []).some((relation) => relation.name === defending)) return 2;
  if ((relations['half_damage_to'] ?? []).some((relation) => relation.name === defending)) return 0.5;
  return 1;
}

// --- Pages ---

export async function loadHome(): Promise<HomeVM> {
  const [species, types, generationList] = await Promise.all([
    apiGet<ApiList>(`pokemon-species/${ALL}`),
    allTypes(),
    apiGet<ApiList>(`generation/${ALL}`),
  ]);
  const generations = await Promise.all(generationList.results.map((r) => apiGet<ApiGeneration>(r.url)));

  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!(id < ALTERNATE_FORM_MIN_ID)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, name: type.name });
      typesById.set(id, list);
    }
  }
  const generationById = new Map<number, string>();
  for (const generation of generations) {
    for (const s of generation.pokemon_species) generationById.set(idFromUrl(s.url), generation.name);
  }

  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) })),
    pokemon: species.results
      .map((r) => {
        const id = idFromUrl(r.url);
        return {
          id,
          name: r.name,
          types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
          generation: generationById.get(id) ?? '',
        };
      })
      .sort((a, b) => a.id - b.id),
  };
}

export async function loadTeam(names: string[]): Promise<TeamVM> {
  const selected = [...new Set(names.filter(Boolean))].slice(0, 6);
  const [types, species] = await Promise.all([
    allTypes(),
    Promise.all(selected.map((name) => apiFind<ApiSpecies>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`))),
  ]);
  const found = species.filter((entry): entry is ApiSpecies => entry !== null);
  const pokemon = await Promise.all(found.map((entry) => apiGet<ApiPokemon>(`pokemon/${entry.id}`)));
  const labels = new Map(types.map((type) => [type.name, englishName(type.names, type.name)]));

  return {
    members: found.map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      types: [...pokemon[index].types]
        .sort((a, b) => a.slot - b.slot)
        .map((slot) => typeRef(slot.type.name, labels)),
    })),
    coverage: types.map((attacking) => {
      let weak = 0;
      let resistant = 0;
      for (const member of pokemon) {
        const multiplier = member.types.reduce(
          (product, slot) => product * attackMultiplier(attacking, slot.type.name),
          1,
        );
        if (multiplier > 1) weak += 1;
        else if (multiplier < 1) resistant += 1;
      }
      return { type: typeRef(attacking.name, labels), weak, resistant };
    }),
  };
}

function toEvolutionNode(link: ApiChainLink): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: link.evolves_to.map(toEvolutionNode),
  };
}

export async function loadPokemon(name: string, game: string | null): Promise<PokemonVM | null> {
  const species = await apiFind<ApiSpecies>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return null;

  const [pokemon, chain, labels] = await Promise.all([
    apiGet<ApiPokemon>(`pokemon/${species.id}`),
    species.evolution_chain ? apiGet<ApiEvolutionChain>(species.evolution_chain.url) : null,
    typeLabels(),
  ]);

  // Version groups in which this Pokémon learns moves, ordered by the group's `order`.
  const groupRefs = new Map<string, ApiRef>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) groupRefs.set(d.version_group.name, d.version_group);
  }
  const groups = (await Promise.all([...groupRefs.values()].map((r) => apiGet<ApiVersionGroup>(r.url)))).sort(
    (a, b) => a.order - b.order,
  );
  const selected = groups.some((g) => g.name === game) ? game : (groups[groups.length - 1]?.name ?? null);

  const learned = pokemon.moves.flatMap((m) =>
    m.version_group_details
      .filter((d) => d.version_group.name === selected)
      .map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })),
  );
  const moveNames = [...new Set(learned.map((l) => l.move.url))];
  const moves = new Map(
    await Promise.all(moveNames.map(async (url) => [url, await apiGet<ApiMove>(url)] as const)),
  );

  const tables = new Map<string, MoveTableVM>();
  const seen = new Set<string>();
  for (const l of learned) {
    const key = `${l.method}|${l.move.name}|${l.method === 'level-up' ? l.level : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const move = moves.get(l.move.url)!;
    const row: MoveRow = {
      level: l.method === 'level-up' ? l.level : null,
      name: move.name,
      label: englishName(move.names, move.name),
      type: typeRef(move.type?.name ?? 'unknown', labels),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
    let table = tables.get(l.method);
    if (!table) {
      table = { method: l.method, label: humanize(l.method), rows: [] };
      tables.set(l.method, table);
    }
    table.rows.push(row);
  }
  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  const moveTables = [...tables.values()].sort(
    (a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label),
  );

  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? null;

  return {
    id: species.id,
    name: species.name,
    title: englishName(species.names, species.name),
    genus: species.genera.find(isEnglish)?.genus ?? null,
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(t.type.name, labels)),
    artwork,
    height: pokemon.height,
    weight: pokemon.weight,
    flavorText: latestFlavorText(species.flavor_text_entries),
    stats: pokemon.stats.map((s) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, label: humanize(species.name), evolvesTo: [] },
    games: groups.map((g) => ({ name: g.name, label: humanize(g.name) })),
    game: selected,
    moveTables,
  };
}

export async function loadMove(name: string): Promise<MoveVM | null> {
  const move = await apiFind<ApiMove>(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [labels, species] = await Promise.all([typeLabels(), speciesNames()]);
  return {
    name: move.name,
    title: englishName(move.names, move.name),
    type: move.type ? typeRef(move.type.name, labels) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: shortEffect(move.effect_entries, move.effect_chance) ?? latestFlavorText(move.flavor_text_entries),
    pokemon: toCards(
      move.learned_by_pokemon.map((ref) => ({ ref })),
      species,
    ),
  };
}

export async function loadAbility(name: string): Promise<AbilityVM | null> {
  const ability = await apiFind<ApiAbility>(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  const species = await speciesNames();
  return {
    name: ability.name,
    title: englishName(ability.names, ability.name),
    effect: shortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon: toCards(
      ability.pokemon.map((p) => ({ ref: p.pokemon, hidden: p.is_hidden })),
      species,
    ),
  };
}

export async function loadTypes(): Promise<TypesVM> {
  const types = await allTypes();
  return { types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })) };
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function loadType(name: string): Promise<TypeVM | null> {
  const type = await apiFind<ApiType>(`type/${encodeURIComponent(name.toLowerCase())}`);
  if (!type) return null;
  const [labels, species] = await Promise.all([typeLabels(), speciesNames()]);
  return {
    name: type.name,
    title: englishName(type.names, type.name),
    relations: RELATIONS.map(([label, key]) => ({
      label,
      types: (type.damage_relations[key] ?? []).map((r) => typeRef(r.name, labels)),
    })),
    pokemon: toCards(
      type.pokemon.map((p) => ({ ref: p.pokemon })),
      species,
    ),
    moves: type.moves
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/**
 * Resolves a page data path (`/pokemon/pikachu?game=red-blue`) to its view model.
 * Resolves to null when the page names something the API doesn't have.
 */
export async function loadPageData(path: string): Promise<unknown> {
  const url = new URL(path, 'http://internal');
  let segments: string[];
  try {
    segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null; // Malformed escape sequence: no such page.
  }
  const [kind, name, ...rest] = segments;
  if (rest.length) return null;
  switch (kind) {
    case 'home':
      return name === undefined ? loadHome() : null;
    case 'types':
      return name === undefined ? loadTypes() : null;
    case 'team':
      return name === undefined ? loadTeam(url.searchParams.getAll('names')) : null;
    case 'pokemon':
      return name ? loadPokemon(name, url.searchParams.get('game')) : null;
    case 'moves':
      return name ? loadMove(name) : null;
    case 'abilities':
      return name ? loadAbility(name) : null;
    case 'type':
      return name ? loadType(name) : null;
    default:
      return null;
  }
}
