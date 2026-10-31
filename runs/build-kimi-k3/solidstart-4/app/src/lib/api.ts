import { query } from "@solidjs/router";
import { collapseWs, dexNumber, enNameOf, humanize } from "./format";

// ---------------------------------------------------------------------------
// Low-level API access (server side only; results cached in memory at runtime)
// ---------------------------------------------------------------------------

const API_BASE = () => (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

const responseCache = new Map<string, Promise<any>>();

function apiFetch(path: string): Promise<any> {
  let p = responseCache.get(path);
  if (!p) {
    p = fetch(`${API_BASE()}${path}`)
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${path}`);
        return res.json();
      })
      .catch((err) => {
        responseCache.delete(path);
        throw err;
      });
    responseCache.set(path, p);
  }
  return p;
}

const idFromUrl = (url: string): number => {
  const m = String(url).replace(/\/+$/, "").match(/\/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Shared index: every species with its types (slot order) and generation,
// built from the species list, the 9 generation records and the 18 type
// records (all live API data, cached for the lifetime of the process).
// ---------------------------------------------------------------------------

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export interface TypeInfo {
  name: string;
  enName: string;
}

export interface SpeciesInfo {
  id: number;
  name: string;
  human: string;
  types: TypeInfo[];
  generation: string | null;
  sprite: string;
}

interface Index {
  list: SpeciesInfo[];
  byId: Map<number, SpeciesInfo>;
  types: TypeInfo[];
  generations: { name: string; enName: string }[];
}

let indexPromise: Promise<Index> | null = null;

function getIndex(): Promise<Index> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

async function buildIndex(): Promise<Index> {
  const [speciesList, genList, typeList] = await Promise.all([
    apiFetch("/api/v2/pokemon-species/?limit=2000"),
    apiFetch("/api/v2/generation/?limit=100"),
    apiFetch("/api/v2/type/?limit=100"),
  ]);

  const genRecs = await Promise.all(genList.results.map((g: any) => apiFetch(`/api/v2/generation/${g.name}/`)));
  const genOf = new Map<string, string>();
  for (const g of genRecs) {
    for (const s of g.pokemon_species ?? []) genOf.set(s.name, g.name);
  }
  const generations = genRecs.map((g: any) => ({ name: g.name, enName: enNameOf(g) }));

  const keptTypeNames: string[] = typeList.results.map((t: any) => t.name).filter((n: string) => !EXCLUDED_TYPES.has(n));
  const typeRecs = await Promise.all(keptTypeNames.map((n) => apiFetch(`/api/v2/type/${n}/`)));
  const typeEn = new Map<string, string>(typeRecs.map((t: any) => [t.name, enNameOf(t)]));
  const types: TypeInfo[] = typeRecs.map((t: any) => ({ name: t.name, enName: typeEn.get(t.name)! }));

  const typesOf = new Map<number, { name: string; slot: number }[]>();
  for (const t of typeRecs) {
    for (const entry of t.pokemon ?? []) {
      const pid = idFromUrl(entry.pokemon.url);
      if (!Number.isFinite(pid) || pid >= 10000) continue;
      let arr = typesOf.get(pid);
      if (!arr) typesOf.set(pid, (arr = []));
      if (!arr.some((x) => x.name === t.name)) arr.push({ name: t.name, slot: entry.slot });
    }
  }

  const list: SpeciesInfo[] = speciesList.results
    .map((s: any) => {
      const id = idFromUrl(s.url);
      const st = (typesOf.get(id) ?? [])
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((x) => ({ name: x.name, enName: typeEn.get(x.name) ?? humanize(x.name) }));
      return {
        id,
        name: s.name,
        human: humanize(s.name),
        types: st,
        generation: genOf.get(s.name) ?? null,
        sprite: `${API_BASE()}/media/sprites/pokemon/${id}.png`,
      };
    })
    .sort((a, b) => a.id - b.id);

  return { list, byId: new Map(list.map((s) => [s.id, s])), types, generations };
}

// ---------------------------------------------------------------------------
// Version group ordering
// ---------------------------------------------------------------------------

let vgPromise: Promise<Map<string, number>> | null = null;

function getVersionGroupOrders(): Promise<Map<string, number>> {
  if (!vgPromise) {
    vgPromise = (async () => {
      const list = await apiFetch("/api/v2/version-group/?limit=100");
      const recs = await mapLimit(list.results, 16, (r: any) => apiFetch(`/api/v2/version-group/${r.name}/`));
      return new Map<string, number>(recs.filter(Boolean).map((r: any) => [r.name, r.order ?? 0]));
    })().catch((err) => {
      vgPromise = null;
      throw err;
    });
  }
  return vgPromise;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

async function getSpeciesAndDefaultPokemon(name: string) {
  const species = await apiFetch(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return null;
  const variety = (species.varieties ?? []).find((v: any) => v.is_default) ?? species.varieties?.[0];
  if (!variety) return null;
  const pokemon = await apiFetch(`/api/v2/pokemon/${idFromUrl(variety.pokemon.url)}/`);
  if (!pokemon) return null;
  return { species, pokemon };
}

function latestEnFlavor(entries: any[] | undefined | null): string | null {
  if (!entries) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i]?.language?.name === "en") return collapseWs(entries[i].flavor_text);
  }
  return null;
}

function buildChain(node: any): any {
  return {
    name: node.species.name,
    human: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(buildChain),
  };
}

interface CardInfo {
  id: number;
  name: string;
  human: string;
  sprite: string;
}

// Map Pokémon references to their species (alternate forms excluded).
async function cardsFromPokemonRefs(refs: { name: string; url: string }[]): Promise<CardInfo[]> {
  const idx = await getIndex();
  const seen = new Set<number>();
  const cards: CardInfo[] = [];
  for (const ref of refs ?? []) {
    const pid = idFromUrl(ref.url);
    if (!Number.isFinite(pid) || pid >= 10000 || seen.has(pid)) continue;
    const s = idx.byId.get(pid);
    if (!s) continue;
    seen.add(pid);
    cards.push({ id: s.id, name: s.name, human: s.human, sprite: s.sprite });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

const typeEnMap = (idx: Index) => new Map(idx.types.map((t) => [t.name, t.enName]));

// ---------------------------------------------------------------------------
// Queries (server functions callable from the client)
// ---------------------------------------------------------------------------

export const getHomeData = query(async () => {
  const idx = await getIndex();
  return { types: idx.types, generations: idx.generations, species: idx.list };
}, "home-data");

export const getTypesList = query(async () => {
  return (await getIndex()).types;
}, "types-list");

export const getPokemonDetail = query(async (name: string) => {
  const found = await getSpeciesAndDefaultPokemon(name);
  if (!found) return null;
  const { species, pokemon } = found;
  const idx = await getIndex();
  const typeEn = typeEnMap(idx);

  let evolution: any = null;
  if (species.evolution_chain?.url) {
    const chain = await apiFetch(`/api/v2/evolution-chain/${idFromUrl(species.evolution_chain.url)}/`);
    if (chain?.chain) evolution = buildChain(chain.chain);
  }
  if (!evolution) evolution = { name: species.name, human: humanize(species.name), children: [] };

  const orders = await getVersionGroupOrders();
  const gameNames = [
    ...new Set<string>(
      (pokemon.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group?.name as string),
      ),
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => (orders.get(a) ?? 9999) - (orders.get(b) ?? 9999));

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name ?? ""),
    value: s.base_stat,
  }));

  return {
    enName: enNameOf(species),
    dex: dexNumber(species.id),
    genus: (species.genera ?? []).find((g: any) => g.language?.name === "en")?.genus ?? "",
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, enName: typeEn.get(t.type.name) ?? humanize(t.type.name) })),
    artwork: pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: Number.isFinite(pokemon.height) ? `${(pokemon.height / 10).toFixed(1)} m` : "—",
    weight: Number.isFinite(pokemon.weight) ? `${(pokemon.weight / 10).toFixed(1)} kg` : "—",
    flavor: latestEnFlavor(species.flavor_text_entries) ?? "",
    stats,
    total: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, human: humanize(a.ability.name), hidden: !!a.is_hidden })),
    evolution,
    games: gameNames.map((g) => ({ name: g, label: humanize(g) })),
  };
}, "pokemon-detail");

export const getPokemonMoves = query(async (name: string, game: string) => {
  const found = await getSpeciesAndDefaultPokemon(name);
  if (!found) return null;
  const { pokemon } = found;

  const byMethod = new Map<string, { name: string; level: number }[]>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group?.name !== game) continue;
      const method = d.move_learn_method?.name ?? "unknown";
      let arr = byMethod.get(method);
      if (!arr) byMethod.set(method, (arr = []));
      arr.push({ name: m.move.name, level: d.level_learned_at ?? 0 });
    }
  }

  const idx = await getIndex();
  const typeEn = typeEnMap(idx);
  const unique = [...new Set([...byMethod.values()].flat().map((r) => r.name))];
  const recs = new Map(await mapLimit(unique, 16, async (n) => [n, await apiFetch(`/api/v2/move/${n}/`)] as const));

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  return {
    methods: methods.map((method) => {
      const rows = byMethod.get(method)!.map((r) => {
        const mv = recs.get(r.name);
        return {
          level: r.level,
          moveName: r.name,
          moveEn: mv ? enNameOf(mv) : humanize(r.name),
          typeName: mv?.type?.name ?? null,
          typeEn: mv?.type?.name ? typeEn.get(mv.type.name) ?? humanize(mv.type.name) : null,
          category: mv?.damage_class?.name ? humanize(mv.damage_class.name) : "—",
          power: mv?.power ?? null,
          accuracy: mv?.accuracy ?? null,
          pp: mv?.pp ?? null,
        };
      });
      rows.sort((a, b) =>
        method === "level-up" ? a.level - b.level || a.moveEn.localeCompare(b.moveEn) : a.moveEn.localeCompare(b.moveEn),
      );
      return { name: method, label: humanize(method), hasLevel: method === "level-up", rows };
    }),
  };
}, "pokemon-moves");

export const getMoveDetail = query(async (name: string) => {
  const mv = await apiFetch(`/api/v2/move/${encodeURIComponent(name)}/`);
  if (!mv) return null;
  const idx = await getIndex();
  const typeEn = typeEnMap(idx);
  const shortEffect = (mv.effect_entries ?? []).find((e: any) => e.language?.name === "en")?.short_effect;
  const learners = await cardsFromPokemonRefs(mv.learned_by_pokemon ?? []);
  return {
    enName: enNameOf(mv),
    type: mv.type ? { name: mv.type.name, enName: typeEn.get(mv.type.name) ?? humanize(mv.type.name) } : null,
    category: mv.damage_class?.name ? humanize(mv.damage_class.name) : "—",
    power: mv.power ?? null,
    accuracy: mv.accuracy ?? null,
    pp: mv.pp ?? null,
    effect: shortEffect ? collapseWs(shortEffect) : latestEnFlavor(mv.flavor_text_entries) ?? "—",
    learners,
  };
}, "move-detail");

export const getAbilityDetail = query(async (name: string) => {
  const ab = await apiFetch(`/api/v2/ability/${encodeURIComponent(name)}/`);
  if (!ab) return null;
  const idx = await getIndex();
  const effect = (ab.effect_entries ?? []).find((e: any) => e.language?.name === "en")?.short_effect;
  const seen = new Set<number>();
  const pokemon: (CardInfo & { hidden: boolean })[] = [];
  for (const entry of ab.pokemon ?? []) {
    const pid = idFromUrl(entry.pokemon.url);
    if (!Number.isFinite(pid) || pid >= 10000 || seen.has(pid)) continue;
    const s = idx.byId.get(pid);
    if (!s) continue;
    seen.add(pid);
    pokemon.push({ id: s.id, name: s.name, human: s.human, sprite: s.sprite, hidden: !!entry.is_hidden });
  }
  pokemon.sort((a, b) => a.id - b.id);
  return { enName: enNameOf(ab), effect: effect ? collapseWs(effect) : "—", pokemon };
}, "ability-detail");

export const getTypeDetail = query(async (name: string) => {
  const t = await apiFetch(`/api/v2/type/${encodeURIComponent(name)}/`);
  if (!t) return null;
  const idx = await getIndex();
  const typeEn = typeEnMap(idx);
  const rel = (list: any[]) =>
    (list ?? []).map((r: any) => ({ name: r.name, enName: typeEn.get(r.name) ?? humanize(r.name) }));
  const dr = t.damage_relations ?? {};
  const pokemon = await cardsFromPokemonRefs((t.pokemon ?? []).map((e: any) => e.pokemon));
  const moves = (t.moves ?? [])
    .map((m: any) => ({ name: m.name, human: humanize(m.name) }))
    .sort((a: any, b: any) => a.human.localeCompare(b.human));
  return {
    enName: enNameOf(t),
    relations: [
      { term: "Super effective against", types: rel(dr.double_damage_to) },
      { term: "Not very effective against", types: rel(dr.half_damage_to) },
      { term: "No effect against", types: rel(dr.no_damage_to) },
      { term: "Weak to", types: rel(dr.double_damage_from) },
      { term: "Resists", types: rel(dr.half_damage_from) },
      { term: "Immune to", types: rel(dr.no_damage_from) },
    ],
    pokemon,
    moves,
  };
}, "type-detail");
