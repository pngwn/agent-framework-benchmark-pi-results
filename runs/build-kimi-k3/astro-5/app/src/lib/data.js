import { api, apiByUrl, apiList, apiMany } from './api.js';
import { englishName, humanize, idFromUrl, latestEnglishFlavor, collapse } from './util.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** Every species the API lists, sorted by dex number: [{id, name}]. */
export async function getSpeciesIndex() {
  const results = await apiList('pokemon-species');
  return results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id);
}

/** The 18 types with their full records, in API order. */
export async function getTypes() {
  const list = (await apiList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await apiMany(list.map((t) => `type/${t.name}`));
  return records
    .filter(Boolean)
    .map((r) => ({ id: r.id, name: r.name, english: englishName(r), record: r }))
    .sort((a, b) => a.id - b.id);
}

/** Map of type API name -> English name (covers the 18 types). */
export async function getTypeEnglishNames() {
  const types = await getTypes();
  return Object.fromEntries(types.map((t) => [t.name, t.english]));
}

/** All generations with their English names and member species ids. */
export async function getGenerations() {
  const list = await apiList('generation');
  const records = await apiMany(list.map((g) => `generation/${g.name}`));
  return records
    .filter(Boolean)
    .map((r) => ({
      id: r.id,
      name: r.name,
      english: englishName(r),
      speciesIds: (r.pokemon_species ?? []).map((s) => idFromUrl(s.url)),
    }))
    .sort((a, b) => a.id - b.id);
}

/** Everything the home page needs: species with types + generation, plus filter options. */
export async function getHomeData() {
  const [species, types, generations] = await Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]);
  const speciesIds = new Set(species.map((s) => s.id));

  // Types of each species' default Pokémon (default Pokémon id == species id).
  const typesBySpecies = new Map();
  for (const t of types) {
    for (const entry of t.record.pokemon ?? []) {
      const pid = idFromUrl(entry.pokemon.url);
      if (!speciesIds.has(pid)) continue; // skips alternate forms (ids >= 10000)
      const arr = typesBySpecies.get(pid) ?? [];
      arr[entry.slot - 1] = t.name;
      typesBySpecies.set(pid, arr);
    }
  }

  const genBySpecies = new Map();
  for (const g of generations) {
    for (const id of g.speciesIds) if (!genBySpecies.has(id)) genBySpecies.set(id, g.name);
  }

  const list = species.map((s) => ({
    id: s.id,
    name: s.name,
    human: humanize(s.name),
    types: (typesBySpecies.get(s.id) ?? []).filter(Boolean),
    generation: genBySpecies.get(s.id) ?? '',
  }));
  return { list, types, generations };
}

/** Species + default Pokémon + evolution chain + version groups for /pokemon/:name. */
export async function getPokemonData(name) {
  const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return null;
  const variety = (species.varieties ?? []).find((v) => v.is_default) ?? species.varieties?.[0];
  if (!variety) return null;
  const pokemon = await apiByUrl(variety.pokemon.url);
  if (!pokemon) return null;

  const [chain, typeNames] = await Promise.all([
    species.evolution_chain ? apiByUrl(species.evolution_chain.url) : Promise.resolve(null),
    getTypeEnglishNames(),
  ]);

  const vgNames = new Set();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) vgNames.add(d.version_group.name);
  }
  const vgRecords = await apiMany([...vgNames].map((n) => `version-group/${n}`));
  const groups = vgRecords
    .filter(Boolean)
    .map((r) => ({ name: r.name, order: r.order ?? 0, human: humanize(r.name) }))
    .sort((a, b) => a.order - b.order);

  return { species, pokemon, chain, groups, typeNames };
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

/** Move tables (one per learn method) for a Pokémon in a given version group. */
export async function getMoveTables(pokemon, selectedGroup, typeNames) {
  const byMethod = new Map(); // method -> Map("move@level" -> {name, level})
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selectedGroup) continue;
      const method = d.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, new Map());
      byMethod.get(method).set(`${m.move.name}@${d.level_learned_at}`, {
        name: m.move.name,
        level: d.level_learned_at,
      });
    }
  }

  const moveNames = new Set();
  for (const entries of byMethod.values()) for (const e of entries.values()) moveNames.add(e.name);
  const records = await apiMany([...moveNames].map((n) => `move/${n}`));
  const moveByName = new Map(records.filter(Boolean).map((r) => [r.name, r]));

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  return methods.map((method) => {
    const rows = [...byMethod.get(method).values()].map((e) => {
      const rec = moveByName.get(e.name);
      const typeName = rec?.type?.name ?? '';
      return {
        level: e.level,
        name: e.name,
        english: englishName(rec, humanize(e.name)),
        type: typeName,
        typeEnglish: typeNames[typeName] ?? humanize(typeName),
        category: humanize(rec?.damage_class?.name ?? ''),
        power: rec?.power ?? null,
        accuracy: rec?.accuracy ?? null,
        pp: rec?.pp ?? null,
      };
    });
    rows.sort((a, b) =>
      method === 'level-up'
        ? a.level - b.level || a.english.localeCompare(b.english)
        : a.english.localeCompare(b.english),
    );
    return { method, human: humanize(method), rows };
  });
}

/** Evolution chain as a tree of species names. */
export function evolutionTree(chain) {
  const walk = (link) => ({
    name: link.species.name,
    children: (link.evolves_to ?? []).map(walk),
  });
  return chain?.chain ? walk(chain.chain) : null;
}

/** Map a list of Pokémon references to their species (alternate forms excluded). */
function toSpeciesCards(refs, speciesIndex) {
  const byId = new Map(speciesIndex.map((s) => [s.id, s.name]));
  const seen = new Set();
  const cards = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!byId.has(id) || seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, name: byId.get(id) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

/** Data for /moves/:name. */
export async function getMoveData(name) {
  const move = await api(`move/${encodeURIComponent(name)}`);
  if (!move) return null;
  const [speciesIndex, typeNames] = await Promise.all([getSpeciesIndex(), getTypeEnglishNames()]);
  const learners = toSpeciesCards(move.learned_by_pokemon ?? [], speciesIndex);

  const effectEntry = (move.effect_entries ?? []).find(
    (e) => e.language?.name === 'en' && e.short_effect?.trim(),
  );
  const effect = effectEntry
    ? collapse(effectEntry.short_effect)
    : latestEnglishFlavor(move.flavor_text_entries) ?? '—';

  const typeName = move.type?.name ?? '';
  return {
    move,
    learners,
    effect,
    typeName,
    typeEnglish: typeNames[typeName] ?? humanize(typeName),
    english: englishName(move),
  };
}

/** Data for /abilities/:name. */
export async function getAbilityData(name) {
  const ability = await api(`ability/${encodeURIComponent(name)}`);
  if (!ability) return null;
  const speciesIndex = await getSpeciesIndex();
  const byId = new Map(speciesIndex.map((s) => [s.id, s.name]));
  const seen = new Set();
  const holders = [];
  for (const p of ability.pokemon ?? []) {
    const id = idFromUrl(p.pokemon.url);
    if (!byId.has(id) || seen.has(id)) continue;
    seen.add(id);
    holders.push({ id, name: byId.get(id), hidden: !!p.is_hidden });
  }
  holders.sort((a, b) => a.id - b.id);

  const effectEntry = (ability.effect_entries ?? []).find(
    (e) => e.language?.name === 'en' && e.short_effect?.trim(),
  );
  const effect = effectEntry ? collapse(effectEntry.short_effect) : '—';
  return { ability, holders, effect, english: englishName(ability) };
}

/** Data for /types/:name. */
export async function getTypeData(name) {
  const type = await api(`type/${encodeURIComponent(name)}`);
  if (!type) return null;
  const [speciesIndex, typeNames] = await Promise.all([getSpeciesIndex(), getTypeEnglishNames()]);
  const mons = toSpeciesCards((type.pokemon ?? []).map((p) => p.pokemon), speciesIndex);

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, human: humanize(m.name) }))
    .sort((a, b) => a.human.localeCompare(b.human));

  const rel = type.damage_relations ?? {};
  const relLinks = (arr) =>
    (arr ?? []).map((t) => ({ name: t.name, english: typeNames[t.name] ?? humanize(t.name) }));
  const relations = [
    ['Super effective against', relLinks(rel.double_damage_to)],
    ['Not very effective against', relLinks(rel.half_damage_to)],
    ['No effect against', relLinks(rel.no_damage_to)],
    ['Weak to', relLinks(rel.double_damage_from)],
    ['Resists', relLinks(rel.half_damage_from)],
    ['Immune to', relLinks(rel.no_damage_from)],
  ];

  return {
    type,
    mons,
    moves,
    relations,
    english: typeNames[type.name] ?? englishName(type),
  };
}
