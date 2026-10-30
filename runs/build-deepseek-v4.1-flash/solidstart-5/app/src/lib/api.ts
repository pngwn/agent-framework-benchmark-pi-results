import { query } from "@solidjs/router";
import { humanize } from "./text";

export const MISSING = "—";

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

const apiBase = () =>
  (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

const mediaBase = () => `${apiBase()}/media`;

function idFromUrl(url: string): number {
  const match = String(url || "").match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

function apiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/v2/")) return apiBase() + url;
  if (url.startsWith("/media/")) return apiBase() + url;
  return `${apiBase()}/api/v2/${url.replace(/^\/+/, "")}`;
}

function enName(names: any[] | undefined): string | undefined {
  return names?.find(entry => entry?.language?.name === "en")?.name;
}

function latestEnglishFlavor(entries: any[] | undefined): string {
  const english = (entries || []).filter(entry => entry?.language?.name === "en");
  const text = english.length ? english[english.length - 1]?.flavor_text : "";
  return String(text || "").replace(/\s+/g, " ").trim();
}

function englishShortEffect(entries: any[] | undefined): string {
  const english = (entries || []).filter(entry => entry?.language?.name === "en");
  return (
    english.find(entry => entry?.short_effect)?.short_effect ||
    english.find(entry => entry?.effect)?.effect ||
    ""
  );
}

function spriteUrl(id: number): string {
  return `${mediaBase()}/sprites/pokemon/${id}.png`;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      output[index] = await fn(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return output;
}

const requestCache = new Map<string, Promise<any>>();

async function request(url: string): Promise<any> {
  const absolute = apiUrl(url);
  let pending = requestCache.get(absolute);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(absolute, { headers: { accept: "application/json" } });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${absolute}`);
      }
      return response.json();
    })();
    requestCache.set(absolute, pending);
    pending.catch(() => requestCache.delete(absolute));
  }
  return pending;
}

async function getList(resource: string): Promise<any[]> {
  const list = await request(`/api/v2/${resource}/?limit=100000`);
  return list?.results || [];
}

let speciesListPromise: Promise<any[]> | undefined;
function loadSpeciesList(): Promise<any[]> {
  if (!speciesListPromise) {
    speciesListPromise = getList("pokemon-species").then(async results => {
      let entries = results
        .map(entry => {
          const id = idFromUrl(entry.url);
          return {
            id,
            name: entry.name,
            humanized: humanize(entry.name),
            sprite: spriteUrl(id),
          };
        })
        .filter(entry => Number.isFinite(entry.id))
        .sort((a, b) => a.id - b.id);

      // The shipped snapshot ends at 1025. Species added to the live API may
      // not have a file at the conventional media URL, so use the sprite URL
      // from their Pokémon record when possible.
      const additions = entries.filter(entry => entry.id > 1025);
      if (additions.length) {
        const records = await mapLimit(additions, 8, entry =>
          request(`/api/v2/pokemon/${entry.id}/`),
        );
        const sprites = new Map<number, string>();
        additions.forEach((entry, index) => {
          const sprite =
            records[index]?.sprites?.front_default ||
            records[index]?.sprites?.other?.["official-artwork"]?.front_default;
          if (sprite) sprites.set(entry.id, sprite);
        });
        entries = entries.map(entry =>
          sprites.has(entry.id)
            ? { ...entry, sprite: sprites.get(entry.id)! }
            : entry,
        );
      }
      return entries;
    });
  }
  return speciesListPromise;
}

type TypeInfo = {
  name: string;
  label: string;
  record: any;
};

let typeListPromise: Promise<TypeInfo[]> | undefined;
function loadTypeData(): Promise<TypeInfo[]> {
  if (!typeListPromise) {
    typeListPromise = (async () => {
      const results = (await getList("type")).filter(
        entry => !EXCLUDED_TYPES.has(entry.name),
      );
      const records = await mapLimit(results, 8, entry =>
        request(`/api/v2/type/${encodeURIComponent(entry.name)}/`),
      );
      return records
        .filter(Boolean)
        .map(record => ({
          name: record.name,
          label: enName(record.names) || humanize(record.name),
          record,
        }));
    })();
  }
  return typeListPromise;
}

let generationListPromise: Promise<any[]> | undefined;
function loadGenerationData(): Promise<any[]> {
  if (!generationListPromise) {
    generationListPromise = (async () => {
      const results = await getList("generation");
      const records = await mapLimit(results, 6, entry =>
        request(`/api/v2/generation/${encodeURIComponent(entry.name)}/`),
      );
      return records.filter(Boolean);
    })();
  }
  return generationListPromise;
}

const versionGroupCache = new Map<string, Promise<any>>();
function loadVersionGroup(name: string): Promise<any> {
  let pending = versionGroupCache.get(name);
  if (!pending) {
    pending = request(`/api/v2/version-group/${encodeURIComponent(name)}/`);
    versionGroupCache.set(name, pending);
  }
  return pending;
}

const moveCache = new Map<string, Promise<any>>();
function loadMove(name: string): Promise<any> {
  let pending = moveCache.get(name);
  if (!pending) {
    pending = request(`/api/v2/move/${encodeURIComponent(name)}/`);
    moveCache.set(name, pending);
  }
  return pending;
}

function typeLabels(typeData: TypeInfo[]): Map<string, string> {
  return new Map(typeData.map(type => [type.name, type.label]));
}

function cardsForIds(ids: number[], species: any[]): any[] {
  const byId = new Map(species.map(entry => [entry.id, entry]));
  return [...new Set(ids)]
    .filter(id => Number.isFinite(id) && id <= 10000 && byId.has(id))
    .sort((a, b) => a - b)
    .map(id => {
      const entry = byId.get(id);
      return { id, name: entry.name, humanized: entry.humanized, sprite: entry.sprite };
    });
}

function evolveNode(node: any): any {
  if (!node) return null;
  return {
    name: node.species?.name,
    humanized: humanize(node.species?.name || ""),
    children: (node.evolves_to || []).map(evolveNode).filter(Boolean),
  };
}

export const getHomeData = query(async () => {
  "use server";
  const [species, typeData, generations] = await Promise.all([
    loadSpeciesList(),
    loadTypeData(),
    loadGenerationData(),
  ]);

  const speciesIds = new Set(species.map(entry => entry.id));
  const bySpecies = new Map<number, { slot: number; name: string }[]>();

  for (const type of typeData) {
    for (const entry of type.record?.pokemon || []) {
      const id = idFromUrl(entry?.pokemon?.url);
      if (!Number.isFinite(id) || id > 10000 || !speciesIds.has(id)) continue;
      const list = bySpecies.get(id) || [];
      list.push({ slot: Number(entry.slot) || 0, name: type.name });
      bySpecies.set(id, list);
    }
  }

  return {
    mediaBase: mediaBase(),
    species: species.map(entry => ({
      ...entry,
      types: (bySpecies.get(entry.id) || [])
        .sort((a, b) => a.slot - b.slot)
        .map(item => item.name),
    })),
    types: typeData.map(type => ({ name: type.name, label: type.label })),
    generations: generations.map(record => ({
      name: record.name,
      label: enName(record.names) || humanize(record.name),
      speciesIds: (record.pokemon_species || [])
        .map((entry: any) => idFromUrl(entry.url))
        .filter((id: number) => speciesIds.has(id)),
    })),
  };
}, "home-data");

export const getTypeList = query(async () => {
  "use server";
  const types = await loadTypeData();
  return types.map(type => ({ name: type.name, label: type.label }));
}, "type-list");

export const getPokemonPage = query(async (name: string) => {
  "use server";
  const species = await request(
    `/api/v2/pokemon-species/${encodeURIComponent(name)}/`,
  );
  if (!species) return null;

  const variety =
    (species.varieties || []).find((entry: any) => entry.is_default) ||
    (species.varieties || [])[0];
  if (!variety) return null;

  const [pokemon, typeData, chain] = await Promise.all([
    request(`/api/v2/pokemon/${encodeURIComponent(variety.pokemon.name)}/`),
    loadTypeData(),
    species.evolution_chain?.url
      ? request(species.evolution_chain.url)
      : Promise.resolve(null),
  ]);
  if (!pokemon) return null;

  const labels = typeLabels(typeData);
  const versionGroupNames = [
    ...new Set<string>(
      (pokemon.moves || []).flatMap((move: any) =>
        (move.version_group_details || []).map(
          (detail: any) => detail.version_group?.name,
        ),
      ),
    ),
  ].filter(Boolean);
  const versionGroups = (
    await mapLimit(versionGroupNames, 12, loadVersionGroup)
  ).filter(Boolean);
  const games = versionGroups
    .map(record => ({
      name: record.name,
      label: humanize(record.name),
      order: Number(record.order) || 0,
    }))
    .sort((a, b) => a.order - b.order);

  const statLabels: Record<string, string> = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };

  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default ||
    spriteUrl(pokemon.id);

  const englishName = enName(species.names) || humanize(species.name);
  const genus =
    species.genera?.find((entry: any) => entry.language?.name === "en")?.genus ||
    MISSING;
  const flavor = latestEnglishFlavor(species.flavor_text_entries) || MISSING;

  return {
    species: {
      id: species.id,
      name: species.name,
      englishName,
      genus,
      flavor,
      dex: `#${String(species.id).padStart(4, "0")}`,
    },
    pokemon: {
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      artwork,
      types: [...(pokemon.types || [])]
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((entry: any) => ({
          name: entry.type.name,
          label: labels.get(entry.type.name) || humanize(entry.type.name),
        })),
      abilities: [...(pokemon.abilities || [])]
        .sort((a: any, b: any) => a.slot - b.slot)
        .filter((entry: any) => entry.ability)
        .map((entry: any) => ({
          name: entry.ability.name,
          label: humanize(entry.ability.name),
          hidden: Boolean(entry.is_hidden),
        })),
      stats: (pokemon.stats || []).map((entry: any) => ({
        name: entry.stat.name,
        label: statLabels[entry.stat.name] || humanize(entry.stat.name),
        value: Number(entry.base_stat) || 0,
      })),
    },
    evolution: evolveNode(chain?.chain),
    games,
    defaultGame: games.length ? games[games.length - 1].name : null,
  };
}, "pokemon-page");

export const getPokemonMoves = query(
  async (pokemonName: string, game: string) => {
    "use server";
    const [pokemon, typeData] = await Promise.all([
      request(`/api/v2/pokemon/${encodeURIComponent(pokemonName)}/`),
      loadTypeData(),
    ]);
    if (!pokemon) return { groups: [] };

    const labels = typeLabels(typeData);
    const entries = new Map<
      string,
      { moveName: string; method: string; level: number }
    >();

    for (const move of pokemon.moves || []) {
      const detail = (move.version_group_details || []).find(
        (item: any) => item.version_group?.name === game,
      );
      if (!detail) continue;
      const method = detail.move_learn_method?.name || "other";
      const key = `${method}:${move.move.name}`;
      if (!entries.has(key)) {
        entries.set(key, {
          moveName: move.move.name,
          method,
          level: Number(detail.level_learned_at) || 0,
        });
      }
    }

    const source = [...entries.values()];
    const moveRecords = await mapLimit(source, 20, entry =>
      loadMove(entry.moveName),
    );

    const groups = new Map<string, any[]>();
    source.forEach((entry, index) => {
      const record = moveRecords[index];
      if (!entry || !moveRecords) return;
      if (!record) return;
      const method = entry.method;
      const row = {
        level: entry.level,
        move: {
          name: record.name,
          label: enName(record.names) || humanize(record.name),
        },
        type: {
          name: record.type?.name,
          label:
            labels.get(record.type?.name) ||
            humanize(record.type?.name || ""),
        },
        category: humanize(record.damage_class?.name || ""),
        power: record.power ?? null,
        accuracy: record.accuracy ?? null,
        pp: record.pp ?? null,
      };
      const rows = groups.get(method) || [];
      rows.push(row);
      groups.set(method, rows);
    });

    const preferred = ["level-up", "machine", "egg", "tutor"];
    const methodOrder = (method: string) => {
      const index = preferred.indexOf(method);
      return index === -1 ? preferred.length : index;
    };

    return {
      groups: [...groups.entries()]
        .map(([method, rows]) => {
          const sorted = [...rows].sort((a, b) => {
            if (method === "level-up" && a.level !== b.level) {
              return a.level - b.level;
            }
            return a.move.label.localeCompare(b.move.label);
          });
          return {
            method,
            label: humanize(method),
            level: method === "level-up",
            rows: sorted,
          };
        })
        .sort((a, b) => {
          const preferredDiff = methodOrder(a.method) - methodOrder(b.method);
          if (preferredDiff !== 0) return preferredDiff;
          return a.label.localeCompare(b.label);
        }),
    };
  },
  "pokemon-moves",
);

export const getMovePage = query(async (name: string) => {
  "use server";
  const [move, species, typeData] = await Promise.all([
    request(`/api/v2/move/${encodeURIComponent(name)}/`),
    loadSpeciesList(),
    loadTypeData(),
  ]);
  if (!move) return null;

  const labels = typeLabels(typeData);
  const effect =
    englishShortEffect(move.effect_entries) ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    MISSING;
  const ids = (move.learned_by_pokemon || []).map((entry: any) =>
    idFromUrl(entry.url),
  );

  return {
    move: {
      name: move.name,
      label: enName(move.names) || humanize(move.name),
      type: {
        name: move.type?.name,
        label:
          labels.get(move.type?.name) || humanize(move.type?.name || ""),
      },
      category: humanize(move.damage_class?.name || "") || MISSING,
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    },
    effect,
    cards: cardsForIds(ids, species),
  };
}, "move-page");

export const getAbilityPage = query(async (name: string) => {
  "use server";
  const [ability, species] = await Promise.all([
    request(`/api/v2/ability/${encodeURIComponent(name)}/`),
    loadSpeciesList(),
  ]);
  if (!ability) return null;

  const hiddenById = new Map<number, boolean>();
  const ids: number[] = [];
  for (const entry of ability.pokemon || []) {
    const id = idFromUrl(entry?.pokemon?.url);
    if (!Number.isFinite(id) || id > 10000) continue;
    ids.push(id);
    hiddenById.set(id, Boolean(hiddenById.get(id) || entry.is_hidden));
  }

  const cards = cardsForIds(ids, species).map(card => ({
    ...card,
    hidden: Boolean(hiddenById.get(card.id)),
  }));

  return {
    ability: {
      name: ability.name,
      label: enName(ability.names) || humanize(ability.name),
    },
    effect: englishShortEffect(ability.effect_entries) || MISSING,
    cards,
  };
}, "ability-page");

export const getTypePage = query(async (name: string) => {
  "use server";
  if (EXCLUDED_TYPES.has(name)) return null;
  const [record, species, typeData] = await Promise.all([
    request(`/api/v2/type/${encodeURIComponent(name)}/`),
    loadSpeciesList(),
    loadTypeData(),
  ]);
  if (!record) return null;

  const labels = typeLabels(typeData);
  const relation = (entries: any[]) =>
    (entries || []).map(entry => ({
      name: entry.name,
      label: labels.get(entry.name) || humanize(entry.name),
    }));

  const relations = [
    {
      term: "Super effective against",
      items: relation(record.damage_relations?.double_damage_to),
    },
    {
      term: "Not very effective against",
      items: relation(record.damage_relations?.half_damage_to),
    },
    {
      term: "No effect against",
      items: relation(record.damage_relations?.no_damage_to),
    },
    {
      term: "Weak to",
      items: relation(record.damage_relations?.double_damage_from),
    },
    {
      term: "Resists",
      items: relation(record.damage_relations?.half_damage_from),
    },
    {
      term: "Immune to",
      items: relation(record.damage_relations?.no_damage_from),
    },
  ];

  const ids = (record.pokemon || []).map((entry: any) =>
    idFromUrl(entry?.pokemon?.url),
  );
  const moves = (record.moves || [])
    .map((entry: any) => ({
      name: entry.name,
      label: humanize(entry.name),
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));

  return {
    type: {
      name: record.name,
      label: enName(record.names) || humanize(record.name),
    },
    relations,
    cards: cardsForIds(ids, species),
    moves,
  };
}, "type-page");
