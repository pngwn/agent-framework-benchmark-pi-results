// Data access layer. All functions are SolidStart server queries: they always run
// on the server (the client calls them over RPC), read API_BASE_URL from the
// environment, and fetch the PokeAPI over HTTP at request time. Responses are
// cached in memory for the lifetime of the process.
import { query } from "@solidjs/router";
import {
  humanize,
  englishName,
  latestEnglishFlavor,
  idFromUrl,
  isAlternateForm,
  collapseWhitespace,
  EM_DASH,
} from "./util.js";

const cache = new Map();

function apiBase() {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");
}

async function apiFetch(path) {
  const url = `${apiBase()}/api/v2/${path}`;
  if (cache.has(url)) return cache.get(url);
  const promise = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  cache.set(url, promise);
  return promise;
}

async function apiList(resource) {
  const data = await apiFetch(`${resource}/?limit=100000`);
  return data?.results ?? [];
}

// ---------------------------------------------------------------------------
// Shared lookups

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

async function loadTypes() {
  const list = await apiList("type");
  const records = await Promise.all(
    list.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => apiFetch(`type/${t.name}/`)),
  );
  return records
    .filter(Boolean)
    .map((rec) => ({ name: rec.name, en: englishName(rec.names) ?? humanize(rec.name) }));
}

async function loadTypeNameMap() {
  const types = await loadTypes();
  const map = new Map(types.map((t) => [t.name, t.en]));
  return map;
}

function typeDisplay(map, name) {
  return { name, en: map.get(name) ?? humanize(name) };
}

async function loadGenerations() {
  const list = await apiList("generation");
  const records = await Promise.all(list.map((g) => apiFetch(`generation/${g.name}/`)));
  return records
    .filter(Boolean)
    .map((rec) => ({ name: rec.name, en: englishName(rec.names) ?? humanize(rec.name) }));
}

async function loadSpeciesIndex() {
  const list = await apiList("pokemon-species");
  return list
    .map((s) => ({ name: s.name, id: idFromUrl(s.url) }))
    .filter((s) => s.id != null)
    .sort((a, b) => a.id - b.id);
}

async function loadSpeciesNameById() {
  const index = await loadSpeciesIndex();
  return new Map(index.map((s) => [s.id, s.name]));
}

function spriteUrl(pokemonId) {
  return `${apiBase()}/media/sprites/pokemon/${pokemonId}.png`;
}

// Build species cards from a list of pokemon references ({ name, url }).
// Alternate forms are excluded and several forms of one species collapse into
// a single card for the species.
async function cardsFromPokemonRefs(refs, extra = () => ({})) {
  const speciesNames = await loadSpeciesNameById();
  const seen = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (id == null || isAlternateForm(id)) continue;
    const speciesName = speciesNames.get(id);
    if (!speciesName) continue;
    if (!seen.has(id)) {
      seen.set(id, {
        id,
        name: speciesName,
        human: humanize(speciesName),
        sprite: spriteUrl(id),
        ...extra(ref),
      });
    } else {
      Object.assign(seen.get(id), extra(ref));
    }
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home page

export const getHomeData = query(async (search) => {
  "use server";
  const params = new URLSearchParams(search ?? "");
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const typeName = params.get("type") ?? "";
  const generationName = params.get("generation") ?? "";
  let page = Number.parseInt(params.get("page") ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const [species, types, generations, typeMap] = await Promise.all([
    loadSpeciesIndex(),
    loadTypes(),
    loadGenerations(),
    loadTypeNameMap(),
  ]);

  let typeIds = null;
  if (typeName) {
    const rec = await apiFetch(`type/${encodeURIComponent(typeName)}/`);
    if (rec) {
      typeIds = new Set();
      for (const p of rec.pokemon ?? []) {
        const id = idFromUrl(p.pokemon?.url);
        if (id != null && !isAlternateForm(id)) typeIds.add(id);
      }
    }
  }

  let generationNames = null;
  if (generationName) {
    const rec = await apiFetch(`generation/${encodeURIComponent(generationName)}/`);
    if (rec) {
      generationNames = new Set((rec.pokemon_species ?? []).map((s) => s.name));
    }
  }

  const matched = species.filter((s) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false;
    if (typeIds && !typeIds.has(s.id)) return false;
    if (generationNames && !generationNames.has(s.name)) return false;
    return true;
  });

  const PAGE_SIZE = 48;
  const count = matched.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  const slice = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cards = await Promise.all(
    slice.map(async (s) => {
      const pokemon = await apiFetch(`pokemon/${s.id}/`);
      const cardTypes = (pokemon?.types ?? [])
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((t) => typeDisplay(typeMap, t.type.name));
      return {
        id: s.id,
        name: s.name,
        human: humanize(s.name),
        sprite: pokemon?.sprites?.front_default ?? spriteUrl(s.id),
        types: cardTypes,
      };
    }),
  );

  return {
    cards,
    count,
    page,
    totalPages,
    q: params.get("q") ?? "",
    type: typeName,
    generation: generationName,
    types,
    generations,
  };
}, "home");

// ---------------------------------------------------------------------------
// Pokémon page

const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export const getPokemonPage = query(async (name, game) => {
  "use server";
  const species = await apiFetch(`pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return null;
  const pokemon = await apiFetch(`pokemon/${species.id}/`);
  if (!pokemon) return null;

  const [chainRecord, typeMap] = await Promise.all([
    apiFetch(`evolution-chain/${idFromUrl(species.evolution_chain?.url)}/`),
    loadTypeNameMap(),
  ]);

  const en = englishName(species.names) ?? humanize(species.name);
  const genus = (species.genera ?? []).find((g) => g.language?.name === "en")?.genus ?? "";

  const stats = (pokemon.stats ?? []).map((s) => ({
    label: STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((a) => ({
      name: a.ability.name,
      human: humanize(a.ability.name),
      hidden: Boolean(a.is_hidden),
    }));

  const toEvoNode = (link) => ({
    name: link.species.name,
    human: humanize(link.species.name),
    evolutions: (link.evolves_to ?? []).map(toEvoNode),
  });
  const evolution = chainRecord?.chain ? toEvoNode(chainRecord.chain) : null;

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const vgNames = new Set();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) vgNames.add(d.version_group?.name);
  }
  const vgRecords = (await Promise.all([...vgNames].map((n) => apiFetch(`version-group/${n}/`)))).filter(Boolean);
  vgRecords.sort((a, b) => a.order - b.order);
  const games = vgRecords.map((v) => ({ name: v.name, human: humanize(v.name) }));
  const selectedGame = games.some((g) => g.name === game) ? game : (games[games.length - 1]?.name ?? null);

  // Collect rows per learn method for the selected version group.
  const byMethod = new Map(); // method name -> Map<moveName, rows[]>
  if (selectedGame) {
    for (const m of pokemon.moves ?? []) {
      for (const d of m.version_group_details ?? []) {
        if (d.version_group?.name !== selectedGame) continue;
        const method = d.move_learn_method?.name ?? "unknown";
        if (!byMethod.has(method)) byMethod.set(method, new Map());
        const moves = byMethod.get(method);
        if (!moves.has(m.move.name)) moves.set(m.move.name, []);
        moves.get(m.move.name).push({ level: d.level_learned_at ?? 0 });
      }
    }
  }

  const moveNames = new Set();
  for (const moves of byMethod.values()) for (const n of moves.keys()) moveNames.add(n);
  const moveRecords = new Map(
    (await Promise.all([...moveNames].map(async (n) => [n, await apiFetch(`move/${n}/`)]))).filter(([, r]) => r),
  );

  const methodEntries = [...byMethod.entries()]
    .map(([method, moves]) => {
      const rows = [];
      for (const [moveName, levels] of moves) {
        const rec = moveRecords.get(moveName);
        for (const { level } of levels) {
          rows.push({
            level,
            moveName,
            moveEn: rec ? (englishName(rec.names) ?? humanize(moveName)) : humanize(moveName),
            typeName: rec?.type?.name ?? null,
            typeEn: rec?.type?.name ? typeDisplay(typeMap, rec.type.name).en : null,
            category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : EM_DASH,
            power: rec?.power ?? null,
            accuracy: rec?.accuracy ?? null,
            pp: rec?.pp ?? null,
          });
        }
      }
      return { method, label: humanize(method), rows };
    })
    .filter((m) => m.rows.length > 0);

  methodEntries.sort((a, b) => {
    const ai = METHOD_ORDER.indexOf(a.method);
    const bi = METHOD_ORDER.indexOf(b.method);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.label.localeCompare(b.label);
  });

  for (const m of methodEntries) {
    m.rows.sort((a, b) => {
      if (m.method === "level-up" && a.level !== b.level) return a.level - b.level;
      return a.moveEn.localeCompare(b.moveEn);
    });
  }

  const methods = methodEntries.map((m) => ({
    label: m.label,
    hasLevel: m.method === "level-up",
    rows: m.rows,
  }));

  return {
    speciesName: species.name,
    en,
    id: species.id,
    dex: species.id,
    genus,
    flavor: latestEnglishFlavor(species.flavor_text_entries) ?? "",
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => typeDisplay(typeMap, t.type.name)),
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      spriteUrl(species.id),
    stats,
    total,
    abilities,
    evolution,
    games,
    selectedGame,
    methods,
  };
}, "pokemon");

// ---------------------------------------------------------------------------
// Move page

export const getMovePage = query(async (name) => {
  "use server";
  const move = await apiFetch(`move/${encodeURIComponent(name)}/`);
  if (!move) return null;
  const typeMap = await loadTypeNameMap();

  const effectEntry = (move.effect_entries ?? []).find((e) => e.language?.name === "en");
  const effect = effectEntry
    ? collapseWhitespace(effectEntry.short_effect)
    : (latestEnglishFlavor(move.flavor_text_entries) ?? EM_DASH);

  const cards = await cardsFromPokemonRefs(move.learned_by_pokemon ?? []);

  return {
    en: englishName(move.names) ?? humanize(move.name),
    type: move.type?.name ? typeDisplay(typeMap, move.type.name) : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : EM_DASH,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
}, "move");

// ---------------------------------------------------------------------------
// Ability page

export const getAbilityPage = query(async (name) => {
  "use server";
  const ability = await apiFetch(`ability/${encodeURIComponent(name)}/`);
  if (!ability) return null;

  const effectEntry = (ability.effect_entries ?? []).find((e) => e.language?.name === "en");
  const effect = effectEntry ? collapseWhitespace(effectEntry.short_effect) : EM_DASH;

  const cards = await cardsFromPokemonRefs(
    (ability.pokemon ?? []).map((p) => p.pokemon),
    // extra info looked up by pokemon ref below
  );
  // Attach the hidden flag (per pokemon reference).
  const hiddenById = new Map();
  for (const p of ability.pokemon ?? []) {
    const id = idFromUrl(p.pokemon?.url);
    if (id != null && p.is_hidden) hiddenById.set(id, true);
  }
  for (const card of cards) card.hidden = Boolean(hiddenById.get(card.id));

  return {
    en: englishName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
}, "ability");

// ---------------------------------------------------------------------------
// Type list and type page

export const getTypesData = query(async () => {
  "use server";
  return loadTypes();
}, "typeList");

const DAMAGE_RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
];

export const getTypePage = query(async (name) => {
  "use server";
  const rec = await apiFetch(`type/${encodeURIComponent(name)}/`);
  if (!rec) return null;
  const typeMap = await loadTypeNameMap();

  const relations = DAMAGE_RELATIONS.map(([key, label]) => ({
    label,
    types: (rec.damage_relations?.[key] ?? [])
      .map((t) => typeDisplay(typeMap, t.name))
      .sort((a, b) => a.en.localeCompare(b.en)),
  }));

  const cards = await cardsFromPokemonRefs((rec.pokemon ?? []).map((p) => p.pokemon));

  const moves = (rec.moves ?? [])
    .map((m) => ({ name: m.name, human: humanize(m.name) }))
    .sort((a, b) => a.human.localeCompare(b.human));

  return {
    en: englishName(rec.names) ?? humanize(rec.name),
    relations,
    cards,
    moves,
  };
}, "type");
