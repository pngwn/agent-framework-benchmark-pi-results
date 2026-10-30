// Builds page data from API responses. Server only.
import { apiBase, find, get, isValidName } from "./api";
import { englishName, humanize, idFromUrl, latestFlavorText, shortEffect } from "./format";
import { coverageRows, type TypeRelations } from "./team";

export interface TypeRef {
  name: string;
  label: string;
}

export interface Card {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const MAX_ID = 10000;

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

interface ListResult {
  count: number;
  results: { name: string; url: string }[];
}

const fullList = (resource: string) => get<ListResult>(`${resource}/?limit=100000`);

/** All species as id -> name. */
export async function speciesById() {
  const list = await fullList("pokemon-species");
  const map = new Map<number, string>();
  for (const r of list.results) map.set(idFromUrl(r.url), r.name);
  return map;
}

/** English name for any type, by API name. */
export async function typeRef(name: string): Promise<TypeRef> {
  const type = await find(`type/${name}`);
  return { name, label: englishName(type?.names, name) };
}

/** The 18 types in API order, with their full records. */
export async function mainTypes() {
  const list = await fullList("type");
  const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
  return Promise.all(
    names.map(async (name) => {
      const record = await get(`type/${name}`);
      return { name, label: englishName(record.names, name), record };
    }),
  );
}

export async function generations() {
  const list = await fullList("generation");
  return Promise.all(
    list.results.map(async (r) => {
      const record = await get(r.url);
      return { name: r.name, label: englishName(record.names, r.name), record, id: idFromUrl(r.url) };
    }),
  ).then((gens) => gens.sort((a, b) => a.id - b.id));
}

/** Turns references to Pokémon (not species) into species cards, sorted by dex number. */
export async function cardsForPokemon<T extends { pokemon: { name: string; url: string } }>(
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Promise<Card[]> {
  const species = await speciesById();
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!(id <= MAX_ID) || seen.has(id)) continue;
    seen.add(id);
    const name = species.get(id) ?? ref.pokemon.name;
    cards.push({ id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home

export const PAGE_SIZE = 48;

export interface HomeFilters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

export async function homePage(params: URLSearchParams) {
  const [species, types, gens] = await Promise.all([speciesById(), mainTypes(), generations()]);

  const typesBySpecies = new Map<number, { slot: number; ref: TypeRef }[]>();
  for (const t of types) {
    for (const entry of t.record.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(entry.pokemon.url);
      if (!(id <= MAX_ID)) continue;
      const list = typesBySpecies.get(id) ?? [];
      list.push({ slot: entry.slot, ref: { name: t.name, label: t.label } });
      typesBySpecies.set(id, list);
    }
  }
  const genBySpecies = new Map<number, string>();
  for (const g of gens) {
    for (const s of g.record.pokemon_species as { url: string }[]) genBySpecies.set(idFromUrl(s.url), g.name);
  }

  const q = (params.get("q") ?? "").trim();
  const type = types.some((t) => t.name === params.get("type")) ? params.get("type")! : "";
  const generation = gens.some((g) => g.name === params.get("generation")) ? params.get("generation")! : "";
  const needle = q.toLowerCase();

  const matches = [...species.entries()]
    .filter(([id]) => id <= MAX_ID)
    .sort((a, b) => a[0] - b[0])
    .filter(([id, name]) => {
      if (needle && !humanize(name).toLowerCase().includes(needle)) return false;
      if (type && !typesBySpecies.get(id)?.some((t) => t.ref.name === type)) return false;
      if (generation && genBySpecies.get(id) !== generation) return false;
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;

  const cards: Card[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(([id, name]) => ({
    id,
    name,
    label: humanize(name),
    sprite: spriteUrl(id),
    types: (typesBySpecies.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.ref),
  }));

  return {
    filters: { q, type, generation, page } as HomeFilters,
    count: matches.length,
    totalPages,
    cards,
    typeOptions: types.map((t) => ({ name: t.name, label: t.label })),
    generationOptions: gens.map((g) => ({ name: g.name, label: g.label })),
  };
}

// ---------------------------------------------------------------------------
// Pokémon

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string;
  label: string;
  rows: MoveRow[];
}

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

async function moveRow(name: string, level: number | null): Promise<MoveRow> {
  const move = await find(`move/${name}`);
  return {
    level,
    name,
    label: englishName(move?.names, name),
    type: move?.type ? await typeRef(move.type.name) : null,
    category: move?.damage_class ? humanize(move.damage_class.name) : null,
    power: move?.power ?? null,
    accuracy: move?.accuracy ?? null,
    pp: move?.pp ?? null,
  };
}

export async function pokemonPage(name: string, requestedGame: string | null) {
  if (!isValidName(name)) return null;
  const species = await find(`pokemon-species/${name.toLowerCase()}`);
  if (!species) return null;
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, chain] = await Promise.all([
    get(variety ? variety.pokemon.url : `pokemon/${species.id}`),
    species.evolution_chain ? find(species.evolution_chain.url) : null,
  ]);

  const types: TypeRef[] = await Promise.all(
    [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeRef(t.type.name)),
  );

  const stats: { name: string; label: string; value: number }[] = pokemon.stats.map((s: any) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  const abilities = [...pokemon.abilities]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((a: any) => ({ name: a.ability.name as string, label: humanize(a.ability.name), hidden: !!a.is_hidden }));

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  const groups = await Promise.all(
    [...groupNames].map(async (g) => {
      const vg = await find(`version-group/${g}`);
      return { name: g, label: humanize(g), order: (vg?.order as number) ?? Number.MAX_SAFE_INTEGER };
    }),
  );
  groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const game = groups.find((g) => g.name === requestedGame)?.name ?? groups[groups.length - 1]?.name ?? null;

  const byMethod = new Map<string, Promise<MoveRow>[]>();
  if (game) {
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== game) continue;
        const method = d.move_learn_method.name;
        const list = byMethod.get(method) ?? [];
        list.push(moveRow(m.move.name, method === "level-up" ? d.level_learned_at : null));
        byMethod.set(method, list);
      }
    }
  }
  const rank = (m: string) => {
    const i = METHOD_ORDER.indexOf(m);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  const moveTables: MoveTableData[] = await Promise.all(
    [...byMethod.entries()].map(async ([method, rows]) => {
      const resolved = await Promise.all(rows);
      resolved.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
      return { method, label: humanize(method), rows: resolved };
    }),
  );
  moveTables.sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));

  return {
    id: species.id as number,
    name: species.name as string,
    title: englishName(species.names, species.name),
    genus: (species.genera ?? []).find((g: any) => g.language.name === "en")?.genus ?? null,
    types,
    artwork: (pokemon.sprites?.other?.["official-artwork"]?.front_default as string | null) ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestFlavorText(species.flavor_text_entries),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities,
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games: groups.map(({ name, label }) => ({ name, label })),
    game,
    moveTables,
  };
}

// ---------------------------------------------------------------------------
// Moves, abilities, types

export async function movePage(name: string) {
  if (!isValidName(name)) return null;
  const move = await find(`move/${name.toLowerCase()}`);
  if (!move) return null;
  const effect = shortEffect(move.effect_entries) ?? latestFlavorText(move.flavor_text_entries);
  const learnedBy = await cardsForPokemon((move.learned_by_pokemon ?? []).map((p: any) => ({ pokemon: p })));
  return {
    name: move.name as string,
    title: englishName(move.names, move.name),
    type: move.type ? await typeRef(move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: (move.power as number | null) ?? null,
    accuracy: (move.accuracy as number | null) ?? null,
    pp: (move.pp as number | null) ?? null,
    effect,
    learnedBy,
  };
}

export async function abilityPage(name: string) {
  if (!isValidName(name)) return null;
  const ability = await find(`ability/${name.toLowerCase()}`);
  if (!ability) return null;
  const pokemon = await cardsForPokemon(ability.pokemon ?? [], (ref: any) => ({ hidden: !!ref.is_hidden }));
  return {
    name: ability.name as string,
    title: englishName(ability.names, ability.name),
    effect: shortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon,
  };
}

export async function typesPage() {
  const types = await mainTypes();
  return types.map((t) => ({ name: t.name, label: t.label }));
}

const RELATIONS: [string, string][] = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
];

export async function typePage(name: string) {
  if (!isValidName(name)) return null;
  const type = await find(`type/${name.toLowerCase()}`);
  if (!type) return null;
  const relations = await Promise.all(
    RELATIONS.map(async ([key, label]) => ({
      key,
      label,
      types: await Promise.all(((type.damage_relations?.[key] ?? []) as { name: string }[]).map((t) => typeRef(t.name))),
    })),
  );
  const pokemon = await cardsForPokemon(type.pokemon ?? []);
  const moves = ((type.moves ?? []) as { name: string; url: string }[])
    .filter((m) => idFromUrl(m.url) <= MAX_ID)
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return {
    name: type.name as string,
    title: englishName(type.names, type.name),
    relations,
    pokemon,
    moves,
  };
}

// ---------------------------------------------------------------------------
// Team

export interface TeamMemberData {
  card: Card;
  types: TypeRef[];
}

const names = (refs: { name: string }[] | undefined) => (refs ?? []).map((ref) => ref.name);

/** Resolve the species on a team and their type coverage, in team order. */
export async function teamPage(team: string[]) {
  const [types, teamMembers] = await Promise.all([
    mainTypes(),
    Promise.all(
      team.map(async (name): Promise<TeamMemberData | null> => {
        const species = await find(`pokemon-species/${name}`);
        if (!species) return null;
        const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
        const pokemon = await get(variety ? variety.pokemon.url : `pokemon/${species.id}`);
        const memberTypes = await Promise.all(
          [...pokemon.types]
            .sort((a: any, b: any) => a.slot - b.slot)
            .map((t: any) => typeRef(t.type.name)),
        );
        return {
          card: {
            id: species.id as number,
            name: species.name as string,
            label: humanize(species.name),
            sprite: spriteUrl(species.id),
            types: memberTypes,
          },
          types: memberTypes,
        };
      }),
    ),
  ]);

  const members = teamMembers.filter((member): member is TeamMemberData => member !== null);
  const relations: TypeRelations[] = types.map((t) => ({
    name: t.name,
    label: t.label,
    double: names(t.record.damage_relations?.double_damage_to),
    half: names(t.record.damage_relations?.half_damage_to),
    no: names(t.record.damage_relations?.no_damage_to),
  }));

  return { members, relations, coverage: coverageRows(members, relations) };
}
