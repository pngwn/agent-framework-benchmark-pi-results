import { error } from '@sveltejs/kit';
import {
  api,
  setBase,
  humanize,
  enName,
  idFromUrl,
  dexNumber,
  latestEnglishFlavor,
  getTypeEnglishName,
} from '#lib/api.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function buildEvoNode(node) {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(buildEvoNode),
  };
}

export async function load({ params, url, parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  let species;
  try {
    species = await api(`pokemon-species/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const pokemonId = idFromUrl(variety.pokemon.url);

  const [pokemon, evoChain] = await Promise.all([
    api(`pokemon/${pokemonId}/`),
    api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`),
  ]);

  // Version groups in which this Pokémon learns any moves, ordered by `order`.
  const vgIds = new Map();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      const name = detail.version_group.name;
      if (!vgIds.has(name)) vgIds.set(name, idFromUrl(detail.version_group.url));
    }
  }
  const versionGroups = await Promise.all(
    [...vgIds].map(async ([name, id]) => ({
      name,
      order: (await api(`version-group/${id}/`)).order ?? 0,
    })),
  );
  versionGroups.sort((a, b) => a.order - b.order);
  const games = versionGroups.map((v) => ({ name: v.name, label: humanize(v.name) }));

  let selectedGame = url.searchParams.get('game');
  if (!games.some((g) => g.name === selectedGame)) selectedGame = games.at(-1)?.name ?? null;

  // Rows for the selected version group, grouped by learn method.
  const seen = new Set();
  const rawRows = [];
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      if (detail.version_group.name !== selectedGame) continue;
      const key = `${detail.move_learn_method.name}|${detail.level_learned_at}|${move.move.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawRows.push({
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
        move: move.move.name,
      });
    }
  }

  const moveNames = [...new Set(rawRows.map((r) => r.move))];
  const moveDetails = new Map(
    await Promise.all(
      moveNames.map(async (name) => [name, await api(`move/${encodeURIComponent(name)}/`)]),
    ),
  );

  const moveTypeNames = [...new Set([...moveDetails.values()].map((m) => m.type.name))];
  const moveTypeEn = new Map(
    await Promise.all(moveTypeNames.map(async (name) => [name, await getTypeEnglishName(name)])),
  );

  const byMethod = new Map();
  for (const raw of rawRows) {
    const detail = moveDetails.get(raw.move);
    const row = {
      level: raw.level,
      moveName: raw.move,
      moveLabel: enName(detail.names) ?? humanize(raw.move),
      typeName: detail.type.name,
      typeLabel: moveTypeEn.get(detail.type.name) ?? humanize(detail.type.name),
      category: humanize(detail.damage_class.name),
      power: detail.power ?? null,
      accuracy: detail.accuracy ?? null,
      pp: detail.pp ?? null,
    };
    if (!byMethod.has(raw.method)) byMethod.set(raw.method, []);
    byMethod.get(raw.method).push(row);
  }
  const methods = [...byMethod]
    .map(([name, rows]) => ({ name, label: humanize(name), rows }))
    .sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a.name);
      const ib = METHOD_ORDER.indexOf(b.name);
      return (
        (ia < 0 ? METHOD_ORDER.length : ia) - (ib < 0 ? METHOD_ORDER.length : ib) ||
        a.label.localeCompare(b.label)
      );
    });

  const ownTypeEn = new Map(
    await Promise.all(
      pokemon.types.map(async (t) => [t.type.name, await getTypeEnglishName(t.type.name)]),
    ),
  );
  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => ({ name: t.type.name, en: ownTypeEn.get(t.type.name) ?? humanize(t.type.name) }));

  const stats = pokemon.stats.map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;

  return {
    name: species.name,
    en: enName(species.names) ?? humanize(species.name),
    dex: dexNumber(species.id),
    genus: species.genera.find((g) => g.language?.name === 'en')?.genus ?? '',
    types,
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnglishFlavor(species.flavor_text_entries) ?? '',
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: buildEvoNode(evoChain.chain),
    games,
    selectedGame,
    methods,
  };
}
