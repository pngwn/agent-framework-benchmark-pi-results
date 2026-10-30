import { apiGet, apiGetList, apiPathFromUrl, idFromUrl, mapPool } from "./api";
import { englishEffect, englishName, humanize, latestEnglishFlavor, typeLabel, typeLabel as typeName } from "./format";

export interface SpeciesSummary {
  id: number;
  name: string;
  label: string;
  generation?: string;
  types: string[];
}

export interface TypeSummary {
  name: string;
  label: string;
  id: number;
  order: number;
}

export interface GenerationData {
  name: string;
  label: string;
  order: number;
  species: Set<string>;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

let speciesPromise: Promise<any[]> | undefined;
let generationPromise: Promise<any[]> | undefined;
let typeListPromise: Promise<NamedType[]> | undefined;
let typeDetailsPromise: Promise<any[]> | undefined;
let homePromise: Promise<HomeData> | undefined;

export interface NamedType {
  name: string;
  url: string;
  id: number;
  order: number;
  label: string;
}

export interface HomeData {
  species: any[];
  items: HomeItem[];
  generations: Generation[];
  types: NamedType[];
  speciesById: Map<number, any>;
  typesByPokemon: Map<number, string[]>;
  generationBySpecies: Map<string, string>;
}

export interface HomeItem {
  id: number;
  name: string;
  label: string;
  types: string[];
  generation: string;
}

export interface Generation {
  name: string;
  label: string;
  order: number;
}

export function getSpeciesIndex(): Promise<any[]> {
  speciesPromise ??= apiGetList("pokemon-species").then((list) =>
    list.results
      .map((ref) => ({
        id: idFromUrl(ref.url),
        name: ref.name,
      }))
      .filter((ref): ref is { id: number; name: string } => ref.id !== null)
      .sort((a, b) => a.id - b.id),
  );
  return speciesPromise;
}

export function getGenerations(): Promise<any[]> {
  generationPromise ??= (async () => {
    const list = await apiGetList("generation");
    const details = await mapPool(list.results, 9, (ref) => apiGet<any>(`generation/${ref.name}`));
    return details
      .map((detail) => ({
        name: detail.name,
        label: englishName(detail.names, detail.name),
        order: detail.id,
        species: new Set<string>((detail.pokemon_species ?? []).map((s: any) => s.name)),
      }))
      .sort((a, b) => a.order - b.order);
  })();
  return generationPromise;
}

export function getTypeList(): Promise<NamedType[]> {
  typeListPromise ??= apiGetList("type", 100).then((list) =>
    list.results
      .map((ref, index) => ({
        name: ref.name,
        url: ref.url,
        id: idFromUrl(ref.url) ?? index + 1,
        order: index,
        label: typeLabel(ref.name),
      }))
      .filter((type) => !EXCLUDED_TYPES.has(type.name)),
  );
  return typeListPromise;
}

export function getAllTypeDetails(): Promise<any[]> {
  typeDetailsPromise ??= getTypeList().then((types) =>
    mapPool(types, 9, (type) => apiGet<any>(`type/${type.name}`)),
  );
  return typeDetailsPromise;
}

export async function getHomeData(): Promise<HomeData> {
  homePromise ??= (async () => {
    const [species, generations, typeDetails] = await Promise.all([
      getSpeciesIndex(),
      getGenerations(),
      getAllTypeDetails(),
    ]);
    const speciesById = new Map<number, any>(species.map((s) => [s.id, s]));
    const slotTypes = new Map<number, { name: string; slot: number }[]>();
    const typeMeta = await getTypeList();

    for (const detail of typeDetails) {
      for (const entry of detail.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon?.url);
        if (id === null || id > 10_000) continue;
        const list = slotTypes.get(id) ?? [];
        list.push({ name: detail.name, slot: Number(entry.slot ?? 0) });
        slotTypes.set(id, list);
      }
    }
    const typesByPokemon = new Map<number, string[]>();
    for (const [id, entries] of slotTypes) {
      typesByPokemon.set(
        id,
        entries.sort((a, b) => a.slot - b.slot).map((entry) => entry.name),
      );
    }

    const generationBySpecies = new Map<string, string>();
    for (const generation of generations) {
      for (const speciesName of generation.species) {
        generationBySpecies.set(speciesName, generation.name);
      }
    }

    const items: HomeItem[] = species.map((entry) => ({
      id: entry.id,
      name: entry.name,
      label: humanize(entry.name),
      types: typesByPokemon.get(entry.id) ?? [],
      generation: generationBySpecies.get(entry.name) ?? "",
    }));

    return {
      species,
      items,
      generations: generations.map((g) => ({ name: g.name, label: g.label, order: g.order })),
      types: typeMeta,
      speciesById,
      typesByPokemon,
      generationBySpecies,
    };
  })();
  return homePromise;
}

export function cardForSpeciesId(
  id: number | null,
  speciesById: Map<number, any>,
  fallbackName?: string,
): { id: number; name: string; label: string } | null {
  if (id === null) return null;
  const species = speciesById.get(id);
  if (species) return { id, name: species.name, label: humanize(species.name) };
  if (fallbackName) return { id, name: fallbackName, label: humanize(fallbackName) };
  return null;
}

export interface PokemonPageData {
  species: any;
  pokemon: any;
  evolution: any;
  versionGroups: any[];
  speciesName: string;
  englishName: string;
  genus: string;
  flavor: string;
  abilities: { name: string; label: string; hidden: boolean }[];
  stats: { name: string; label: string; value: number }[];
  types: { name: string; label: string }[];
  artwork: string;
  evolutionRoot: any;
  moves: any[];
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export async function getPokemonPage(name: string): Promise<PokemonPageData | null> {
  let species: any;
  try {
    species = await apiGet<any>(`pokemon-species/${encodeURIComponent(name)}`);
  } catch {
    return null;
  }
  const defaultVariety =
    (species.varieties ?? []).find((variety: any) => variety.is_default)?.pokemon ??
    (species.varieties ?? [])[0]?.pokemon;
  if (!defaultVariety) return null;

  let pokemon: any;
  try {
    pokemon = await apiGet<any>(`pokemon/${defaultVariety.name}`);
  } catch {
    return null;
  }

  const evolutionPath = apiPathFromUrl(species.evolution_chain?.url);
  let evolution: any = null;
  if (evolutionPath) {
    try {
      evolution = await apiGet<any>(evolutionPath);
    } catch {
      evolution = null;
    }
  }

  const groupNames = Array.from(
    new Set<string>(
      (pokemon.moves ?? []).flatMap((move: any) =>
        (move.version_group_details ?? []).map((detail: any) => detail.version_group.name),
      ),
    ),
  );
  const groups = await mapPool(groupNames, 9, async (groupName) => {
    try {
      return await apiGet<any>(`version-group/${groupName}`);
    } catch {
      return { name: groupName, order: 0 };
    }
  });
  const versionGroups = groups.sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));

  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    "";

  return {
    species,
    pokemon,
    evolution,
    versionGroups,
    speciesName: species.name,
    englishName: englishName(species.names, species.name),
    genus: englishName(species.genera?.map((g: any) => ({ name: g.genus, language: g.language })), "") || "",
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    abilities: (pokemon.abilities ?? []).map((entry: any) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    })),
    stats: (pokemon.stats ?? []).map((entry: any) => ({
      name: entry.stat.name,
      label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
      value: entry.base_stat,
    })),
    types: (pokemon.types ?? [])
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({ name: entry.type.name, label: typeName(entry.type.name) })),
    artwork,
    evolutionRoot: evolution?.chain ?? null,
    moves: pokemon.moves ?? [],
  };
}

export async function getMovePage(name: string) {
  let move: any;
  try {
    move = await apiGet<any>(`move/${encodeURIComponent(name)}`);
  } catch {
    return null;
  }
  const species = await getSpeciesIndex();
  const speciesById = new Map<number, any>(species.map((s) => [s.id, s]));
  const learned = (move.learned_by_pokemon ?? [])
    .map((ref: any) => ({ id: idFromUrl(ref.url), name: ref.name }))
    .filter((ref: any) => ref.id !== null && ref.id <= 10_000)
    .map((ref: any) => cardForSpeciesId(ref.id, speciesById, ref.name))
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id);
  return {
    move,
    learned,
    englishName: englishName(move.names, move.name),
    type: { name: move.type.name, label: typeLabel(move.type.name) },
    effect: englishEffect(move.effect_entries) || latestEnglishFlavor(move.flavor_text_entries) || "—",
  };
}

export async function getAbilityPage(name: string) {
  let ability: any;
  try {
    ability = await apiGet<any>(`ability/${encodeURIComponent(name)}`);
  } catch {
    return null;
  }
  const species = await getSpeciesIndex();
  const speciesById = new Map<number, any>(species.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const pokemon = (ability.pokemon ?? [])
    .map((entry: any) => {
      const id = idFromUrl(entry.pokemon?.url);
      return { entry, id };
    })
    .filter(({ id }) => id !== null && id <= 10_000 && !seen.has(id) && (seen.add(id), true))
    .map(({ id, entry }) => {
      const card = cardForSpeciesId(id, speciesById, entry.pokemon?.name);
      return card ? { ...card, hidden: Boolean(entry.is_hidden) } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id);
  return {
    ability,
    pokemon,
    englishName: englishName(ability.names, ability.name),
    effect: englishEffect(ability.effect_entries) || "—",
  };
}

export async function getTypePage(name: string): Promise<any | null> {
  let type: any;
  try {
    type = await apiGet<any>(`type/${encodeURIComponent(name)}`);
  } catch {
    return null;
  }
  if (EXCLUDED_TYPES.has(type.name)) return null;
  const species = await getSpeciesIndex();
  const speciesById = new Map<number, any>(species.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const pokemon = (type.pokemon ?? [])
    .map((entry: any) => ({ id: idFromUrl(entry.pokemon?.url), name: entry.pokemon?.name }))
    .filter(({ id }: any) => {
      if (id === null || id > 10_000 || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(({ id, name: pokemonName }: any) => cardForSpeciesId(id, speciesById, pokemonName))
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id);

  const moveNames = (move: any) => typeLabel(move.name);
  const moves = (type.moves ?? [])
    .map((move: any) => ({ name: move.name, label: moveNames(move) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));

  const relations = type.damage_relations ?? {};
  return {
    type,
    pokemon,
    moves,
    englishName: englishName(type.names, type.name),
    relations,
  };
}


export async function getVersionGroupMoves(pokemon: any, versionGroup: string) {
  const groups: Record<string, { method: string; move: any; level: number }[]> = {};
  const seen = new Set<string>();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name !== versionGroup) continue;
      const method = detail.move_learn_method?.name ?? "other";
      const key = `${method}:${moveEntry.move.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (groups[method] ??= []).push({
        method,
        move: moveEntry.move,
        level: Number(detail.level_learned_at ?? 0),
      });
    }
  }

  const methods = Object.keys(groups);
  const moveByName = new Map<string, any>();
  for (const entries of Object.values(groups)) {
    for (const entry of entries) moveByName.set(entry.move.name, entry.move);
  }
  const details = await mapPool(moveByName.values().toArray(), 12, (ref) => apiGet<any>(`move/${ref.name}`));
  const detailByName = new Map<string, any>(details.map((detail) => [detail.name, detail]));

  const order = ["level-up", "machine", "egg", "tutor"];
  methods.sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });

  return methods.map((method) => ({
    method,
    label: humanize(method),
    rows: groups[method].map((entry) => {
      const detail = detailByName.get(entry.move.name);
      return {
        moveName: detail ? englishName(detail.names, detail.name) : humanize(entry.move.name),
        moveApiName: entry.move.name,
        level: entry.level,
        type: detail?.type ? { name: detail.type.name, label: typeLabel(detail.type.name) } : null,
        category: detail?.damage_class?.name ? humanize(detail.damage_class.name) : "—",
        power: detail?.power ?? null,
        accuracy: detail?.accuracy ?? null,
        pp: detail?.pp ?? null,
      };
    }),
  }));
}
