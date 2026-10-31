import { query } from "@solidjs/router";
import * as api from "./api";
import {
  collapseWhitespace,
  humanize,
  latestEnglishFlavor,
  statLabel,
} from "./format";

export interface CardData {
  id: number;
  name: string;
  humanized: string;
  sprite: string | null;
  hidden?: boolean;
}

// Maps a list of Pokémon references (name/url) to their species, excluding
// alternate forms (IDs above 10000), ordered by dex number.
async function cardsForRefs(refs: { url: string }[]): Promise<CardData[]> {
  const index = await api.getSpeciesIndex();
  const byId = new Map(index.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = api.idFromUrl(ref.url);
    if (id > 10000 || seen.has(id)) continue;
    seen.add(id);
    const species = byId.get(id);
    if (!species) continue;
    cards.push({
      id: species.id,
      name: species.name,
      humanized: humanize(species.name),
      sprite: species.sprite,
    });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

export const homeQuery = query(async (raw: string) => {
  "use server";
  const params = JSON.parse(raw) as {
    q?: string;
    type?: string;
    generation?: string;
    page?: number;
  };
  const [index, types, generations] = await Promise.all([
    api.getSpeciesIndex(),
    api.getTypes(),
    api.getGenerations(),
  ]);
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  let items = index;
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter((s) => humanize(s.name).toLowerCase().includes(q));
  }
  if (params.type) items = items.filter((s) => s.types.includes(params.type!));
  if (params.generation)
    items = items.filter((s) => s.generation === params.generation);
  const total = items.length;
  const perPage = 48;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  let page = Math.floor(params.page ?? 1);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  return {
    total,
    page,
    totalPages,
    types,
    generations,
    items: items.slice((page - 1) * perPage, page * perPage).map((s) => ({
      id: s.id,
      name: s.name,
      humanized: humanize(s.name),
      sprite: s.sprite,
      types: s.types.map((t) => ({ name: t, en: typeEn.get(t) ?? humanize(t) })),
    })),
  };
}, "home");

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export const pokemonQuery = query(async (name: string, game: string | null) => {
  "use server";
  const species = await api.apiRecord(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return null;
  const defaultVariety =
    species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
  const [pokemon, types, vgOrders] = await Promise.all([
    api.apiRecord(`/pokemon/${defaultVariety.pokemon.name}/`),
    api.getTypes(),
    api.getVersionGroupOrders(),
  ]);
  if (!pokemon) return null;
  const chain = await api.apiRecord(
    `/evolution-chain/${api.idFromUrl(species.evolution_chain.url)}/`,
  );
  const typeEn = new Map(types.map((t) => [t.name, t.en]));

  // Version groups in which this Pokémon learns moves, sorted by their order.
  const gameNames: string[] = [
    ...new Set<string>(
      (pokemon.moves as any[]).flatMap((m: any) =>
        (m.version_group_details as any[]).map((d: any) => d.version_group.name as string),
      ),
    ),
  ];
  gameNames.sort(
    (a, b) => (vgOrders.get(a) ?? Infinity) - (vgOrders.get(b) ?? Infinity),
  );
  const selectedGame =
    game && gameNames.includes(game) ? game : gameNames[gameNames.length - 1];

  // Moves for the selected version group, grouped by learn method.
  const entries: { move: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves as any[]) {
    for (const d of m.version_group_details as any[]) {
      if (d.version_group.name !== selectedGame) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        move: m.move.name,
        method: d.move_learn_method.name,
        level: d.level_learned_at,
      });
    }
  }
  const moveNames: string[] = [...new Set<string>(entries.map((e) => e.move))];
  const moveRecs = await api.apiRecordAll(
    moveNames.map((n) => `/move/${encodeURIComponent(n)}/`),
  );
  const moveByName = new Map(moveRecs.filter(Boolean).map((r: any) => [r.name, r]));

  const byMethod = new Map<string, any[]>();
  for (const e of entries) {
    const rec: any = moveByName.get(e.move);
    if (!rec) continue;
    const row = {
      level: e.level,
      move: e.move,
      moveEn: api.englishName(rec.names) ?? humanize(e.move),
      type: rec.type?.name ?? null,
      typeEn: rec.type ? (typeEn.get(rec.type.name) ?? humanize(rec.type.name)) : null,
      category: rec.damage_class ? humanize(rec.damage_class.name) : null,
      power: rec.power ?? null,
      accuracy: rec.accuracy ?? null,
      pp: rec.pp ?? null,
    };
    if (!byMethod.has(e.method)) byMethod.set(e.method, []);
    byMethod.get(e.method)!.push(row);
  }
  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1)
      return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return humanize(a).localeCompare(humanize(b));
  });
  const tables = methods.map((method) => {
    const rows = byMethod.get(method)!;
    if (method === "level-up")
      rows.sort((a, b) => a.level - b.level || a.moveEn.localeCompare(b.moveEn));
    else rows.sort((a, b) => a.moveEn.localeCompare(b.moveEn));
    return { method, label: humanize(method), hasLevel: method === "level-up", rows };
  });

  const evoNode = (node: any): any => ({
    name: node.species.name,
    humanized: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(evoNode),
  });

  const stats = (pokemon.stats as any[]).map((s) => ({
    label: statLabel(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    name: species.name as string,
    en: api.englishName(species.names) ?? humanize(species.name),
    id: species.id as number,
    genus:
      species.genera?.find((g: any) => g.language.name === "en")?.genus ?? null,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: [...(pokemon.types as any[])]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        name: t.type.name as string,
        en: typeEn.get(t.type.name) ?? humanize(t.type.name),
      })),
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...(pokemon.abilities as any[])]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({
        name: a.ability.name as string,
        humanized: humanize(a.ability.name),
        hidden: a.is_hidden as boolean,
      })),
    evolution: chain?.chain ? evoNode(chain.chain) : null,
    games: gameNames.map((g) => ({ name: g, label: humanize(g) })),
    selectedGame,
    tables,
  };
}, "pokemon");

export const moveQuery = query(async (name: string) => {
  "use server";
  const move = await api.apiRecord(`/move/${encodeURIComponent(name)}/`);
  if (!move) return null;
  const types = await api.getTypes();
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  const effectEntries = (move.effect_entries ?? []).filter(
    (e: any) => e.language.name === "en",
  );
  const effect = effectEntries.length
    ? collapseWhitespace(effectEntries[effectEntries.length - 1].short_effect)
    : latestEnglishFlavor(move.flavor_text_entries);
  const cards = await cardsForRefs(move.learned_by_pokemon ?? []);
  return {
    name: move.name as string,
    en: api.englishName(move.names) ?? humanize(move.name),
    type: move.type
      ? {
          name: move.type.name as string,
          en: typeEn.get(move.type.name) ?? humanize(move.type.name),
        }
      : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
}, "move");

export const abilityQuery = query(async (name: string) => {
  "use server";
  const ability = await api.apiRecord(`/ability/${encodeURIComponent(name)}/`);
  if (!ability) return null;
  const effectEntries = (ability.effect_entries ?? []).filter(
    (e: any) => e.language.name === "en",
  );
  const effect = effectEntries.length
    ? collapseWhitespace(effectEntries[effectEntries.length - 1].short_effect)
    : null;
  const index = await api.getSpeciesIndex();
  const byId = new Map(index.map((s) => [s.id, s]));
  const bySpecies = new Map<number, boolean>(); // species id -> hidden
  for (const entry of ability.pokemon as any[]) {
    const id = api.idFromUrl(entry.pokemon.url);
    if (id > 10000) continue;
    const hidden = entry.is_hidden as boolean;
    bySpecies.set(id, bySpecies.has(id) ? bySpecies.get(id)! && hidden : hidden);
  }
  const cards: CardData[] = [...bySpecies.entries()]
    .filter(([id]) => byId.has(id))
    .sort(([a], [b]) => a - b)
    .map(([id, hidden]) => {
      const s = byId.get(id)!;
      return {
        id: s.id,
        name: s.name,
        humanized: humanize(s.name),
        sprite: s.sprite,
        hidden,
      };
    });
  return {
    name: ability.name as string,
    en: api.englishName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
}, "ability");

export const typesQuery = query(async () => {
  "use server";
  return api.getTypes();
}, "types");

const DAMAGE_RELATIONS: { key: string; label: string }[] = [
  { key: "double_damage_to", label: "Super effective against" },
  { key: "half_damage_to", label: "Not very effective against" },
  { key: "no_damage_to", label: "No effect against" },
  { key: "double_damage_from", label: "Weak to" },
  { key: "half_damage_from", label: "Resists" },
  { key: "no_damage_from", label: "Immune to" },
];

export const typeQuery = query(async (name: string) => {
  "use server";
  const type = await api.apiRecord(`/type/${encodeURIComponent(name)}/`);
  if (!type || ["stellar", "unknown", "shadow"].includes(type.name)) return null;
  const types = await api.getTypes();
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  const relations = DAMAGE_RELATIONS.map(({ key, label }) => ({
    label,
    types: (type.damage_relations[key] as any[]).map((t) => ({
      name: t.name as string,
      en: typeEn.get(t.name) ?? humanize(t.name),
    })),
  }));
  const cards = await cardsForRefs(
    (type.pokemon as any[]).map((p) => p.pokemon),
  );
  const moves = (type.moves as any[])
    .map((m) => ({ name: m.name as string, humanized: humanize(m.name) }))
    .sort((a, b) => a.humanized.localeCompare(b.humanized));
  return {
    name: type.name as string,
    en: api.englishName(type.names) ?? humanize(type.name),
    relations,
    cards,
    moves,
  };
}, "type");
