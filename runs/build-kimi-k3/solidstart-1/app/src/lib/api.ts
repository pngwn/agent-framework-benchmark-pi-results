// Server-side access to the PokeAPI HTTP service, with an in-memory cache.
// Only ever executed on the server (inside "use server" queries).
import { enName, humanize, idFromUrl, latestEnFlavor } from "./util";

const API = () =>
  (typeof process !== "undefined" && process.env && process.env.API_BASE_URL) ||
  "http://localhost:9000";

export class NotFoundError extends Error {}

const cache = new Map<string, Promise<any>>();

export function fetchApi(path: string): Promise<any> {
  let p = cache.get(path);
  if (!p) {
    p = (async () => {
      const res = await fetch(`${API()}/api/v2/${path}`);
      if (res.status === 404) throw new NotFoundError(path);
      if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
      return await res.json();
    })();
    cache.set(path, p);
    // Don't cache failures (including 404s) forever.
    p.catch(() => cache.delete(path));
  }
  return p;
}

function mediaSprite(id: number): string {
  return `${API()}/media/sprites/pokemon/${id}.png`;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

/** The 18 type records, in API order. */
export async function getTypeRecords(): Promise<any[]> {
  const list = await fetchApi("type/?limit=100");
  return await Promise.all(
    list.results
      .filter((r: any) => !EXCLUDED_TYPES.has(r.name))
      .map((r: any) => fetchApi(`type/${r.name}/`)),
  );
}

/** Map of type API name -> English name. */
export async function getTypeNameMap(): Promise<Record<string, string>> {
  const records = await getTypeRecords();
  return Object.fromEntries(records.map((t) => [t.name, enName(t.names) ?? humanize(t.name)]));
}

export async function getSpeciesList(): Promise<{ id: number; name: string }[]> {
  const list = await fetchApi("pokemon-species/?limit=3000");
  return list.results.map((r: any) => ({ id: idFromUrl(r.url), name: r.name }));
}

async function getSpeciesNameById(): Promise<Map<number, string>> {
  return new Map((await getSpeciesList()).map((s) => [s.id, s.name]));
}

async function orNull(promise: Promise<any>): Promise<any | null> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

/** Map pokemon refs (possibly alternate forms) to unique default species entries. */
function toSpeciesCards(
  refs: { name: string; url: string }[],
  speciesNameById: Map<number, string>,
  extra?: (ref: any) => Record<string, any>,
) {
  const seen = new Set<number>();
  const cards: any[] = [];
  for (const ref of refs) {
    const p = (ref as any).pokemon ?? ref;
    const id = idFromUrl(p.url);
    // Alternate forms have IDs >= 10000; a default Pokémon's ID equals its species ID.
    if (id >= 10000 || seen.has(id)) continue;
    seen.add(id);
    cards.push({
      id,
      name: speciesNameById.get(id) ?? p.name,
      sprite: mediaSprite(id),
      ...(extra ? extra(ref) : {}),
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

export async function loadHomeData() {
  const [speciesList, genIndex, typeRecords] = await Promise.all([
    getSpeciesList(),
    fetchApi("generation/?limit=100"),
    getTypeRecords(),
  ]);
  const generations = await Promise.all(
    genIndex.results.map((g: any) => fetchApi(`generation/${g.name}/`)),
  );
  const genBySpecies = new Map<string, string>();
  for (const g of generations) {
    for (const s of g.pokemon_species ?? []) genBySpecies.set(s.name, g.name);
  }
  const typeEn = Object.fromEntries(
    typeRecords.map((t) => [t.name, enName(t.names) ?? humanize(t.name)]),
  );
  const typesBySpeciesId = new Map<number, string[]>();
  for (const t of typeRecords) {
    for (const entry of t.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (id >= 10000) continue;
      const arr = typesBySpeciesId.get(id) ?? [];
      arr[entry.slot - 1] = t.name;
      typesBySpeciesId.set(id, arr);
    }
  }
  return {
    species: speciesList.map((s) => ({
      id: s.id,
      name: s.name,
      generation: genBySpecies.get(s.name) ?? null,
      types: (typesBySpeciesId.get(s.id) ?? [])
        .filter(Boolean)
        .map((n) => ({ name: n, en: typeEn[n] ?? humanize(n) })),
      sprite: mediaSprite(s.id),
    })),
    types: typeRecords.map((t) => ({ name: t.name, en: typeEn[t.name] })),
    generations: generations.map((g) => ({
      name: g.name,
      en: enName(g.names) ?? humanize(g.name),
    })),
  };
}

function evoTree(chain: any): any {
  return { name: chain.species.name, children: (chain.evolves_to ?? []).map(evoTree) };
}

export async function loadPokemonPageData(name: string) {
  const species = await orNull(fetchApi(`pokemon-species/${encodeURIComponent(name)}/`));
  if (!species) return null;
  const defVariety =
    species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const pokemonId = idFromUrl(defVariety.pokemon.url);
  const [pokemon, typeEn, evo] = await Promise.all([
    fetchApi(`pokemon/${pokemonId}/`),
    getTypeNameMap(),
    orNull(fetchApi(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`)),
  ]);
  const vgNames = new Set<string>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details) vgNames.add(d.version_group.name);
  }
  const vgRecords = await Promise.all([...vgNames].map((n) => fetchApi(`version-group/${n}/`)));
  const versionGroups = vgRecords
    .map((r) => ({ name: r.name, order: r.order }))
    .sort((a, b) => a.order - b.order);
  const moveRecords = await Promise.all(
    (pokemon.moves ?? []).map((m: any) => fetchApi(`move/${m.move.name}/`)),
  );
  const moves = (pokemon.moves ?? []).map((m: any, i: number) => {
    const rec = moveRecords[i];
    return {
      name: rec.name,
      en: enName(rec.names) ?? humanize(rec.name),
      type: rec.type?.name ?? null,
      typeEn: rec.type ? (typeEn[rec.type.name] ?? humanize(rec.type.name)) : null,
      damageClass: rec.damage_class?.name ?? null,
      power: rec.power ?? null,
      accuracy: rec.accuracy ?? null,
      pp: rec.pp ?? null,
      details: m.version_group_details.map((d: any) => ({
        vg: d.version_group.name,
        method: d.move_learn_method.name,
        level: d.level_learned_at,
      })),
    };
  });
  return {
    id: species.id,
    name: species.name,
    en: enName(species.names) ?? humanize(species.name),
    genus: species.genera?.find((g: any) => g.language.name === "en")?.genus ?? null,
    flavor: latestEnFlavor(species.flavor_text_entries),
    height: pokemon.height,
    weight: pokemon.weight,
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({
        name: t.type.name,
        en: typeEn[t.type.name] ?? humanize(t.type.name),
      })),
    stats: (pokemon.stats ?? []).map((s: any) => ({ name: s.stat.name, base: s.base_stat })),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: evo ? evoTree(evo.chain) : null,
    versionGroups,
    moves,
  };
}

export async function loadMovePageData(name: string) {
  const move = await orNull(fetchApi(`move/${encodeURIComponent(name)}/`));
  if (!move) return null;
  const [typeEn, speciesNameById] = await Promise.all([getTypeNameMap(), getSpeciesNameById()]);
  const shortEffect =
    move.effect_entries?.find((e: any) => e.language.name === "en")?.short_effect ?? null;
  return {
    name: move.name,
    en: enName(move.names) ?? humanize(move.name),
    type: move.type
      ? { name: move.type.name, en: typeEn[move.type.name] ?? humanize(move.type.name) }
      : null,
    damageClass: move.damage_class?.name ?? null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: shortEffect ?? latestEnFlavor(move.flavor_text_entries) ?? null,
    learnedBy: toSpeciesCards(move.learned_by_pokemon ?? [], speciesNameById),
  };
}

export async function loadAbilityPageData(name: string) {
  const ability = await orNull(fetchApi(`ability/${encodeURIComponent(name)}/`));
  if (!ability) return null;
  const speciesNameById = await getSpeciesNameById();
  return {
    name: ability.name,
    en: enName(ability.names) ?? humanize(ability.name),
    effect:
      ability.effect_entries?.find((e: any) => e.language.name === "en")?.short_effect ?? null,
    pokemon: toSpeciesCards(ability.pokemon ?? [], speciesNameById, (ref: any) => ({
      hidden: !!ref.is_hidden,
    })),
  };
}

export async function loadTypeListData() {
  const records = await getTypeRecords();
  return records.map((t) => ({ name: t.name, en: enName(t.names) ?? humanize(t.name) }));
}

const RELATIONS: [string, string][] = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
];

export async function loadTypePageData(name: string) {
  const type = await orNull(fetchApi(`type/${encodeURIComponent(name)}/`));
  if (!type || EXCLUDED_TYPES.has(type.name)) return null;
  const [typeEn, speciesNameById] = await Promise.all([getTypeNameMap(), getSpeciesNameById()]);
  return {
    name: type.name,
    en: enName(type.names) ?? humanize(type.name),
    relations: RELATIONS.map(([key, label]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
        name: t.name,
        en: typeEn[t.name] ?? humanize(t.name),
      })),
    })),
    pokemon: toSpeciesCards(type.pokemon ?? [], speciesNameById),
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name, en: humanize(m.name) }))
      .sort((a: any, b: any) => a.en.localeCompare(b.en)),
  };
}
