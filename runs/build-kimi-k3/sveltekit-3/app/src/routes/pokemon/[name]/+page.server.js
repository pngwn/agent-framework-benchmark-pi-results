import { error } from '@sveltejs/kit';
import { api, getTypeLabelMap, getVersionGroups } from '#lib/server/api.js';
import {
  idFromUrl,
  humanize,
  englishName,
  englishGenus,
  latestEnglishFlavor
} from '#lib/utils.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed'
};

// Learn methods with a fixed position; everything else follows alphabetically.
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export async function load({ params, url }) {
  const species = await api(`pokemon-species/${encodeURIComponent(params.name)}/`);
  if (!species) error(404, 'Not found');

  const variety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  if (!variety) error(404, 'Not found');
  const pokemonId = idFromUrl(variety.pokemon.url);

  const [pokemon, chain, typeLabels, versionGroups] = await Promise.all([
    api(`pokemon/${pokemonId}/`),
    species.evolution_chain?.url
      ? api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`)
      : null,
    getTypeLabelMap(),
    getVersionGroups()
  ]);
  if (!pokemon) error(404, 'Not found');

  // Version groups in which this Pokémon learns moves, in version-group order.
  const learnedIn = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      learnedIn.add(detail.version_group.name);
    }
  }
  const games = versionGroups.filter((g) => learnedIn.has(g.name));
  const requested = url.searchParams.get('game');
  const game = games.find((g) => g.name === requested) ?? games.at(-1) ?? null;

  // One row per move + learn method for the selected version group.
  const rowsByMethod = new Map();
  if (game) {
    const entries = [];
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== game.name) continue;
        entries.push({
          move: move.move.name,
          method: detail.move_learn_method.name,
          level: detail.level_learned_at
        });
      }
    }
    const moveRecords = await Promise.all(entries.map((e) => api(`move/${e.move}/`)));
    entries.forEach((entry, i) => {
      const record = moveRecords[i];
      const typeName = record?.type?.name ?? '';
      const row = {
        level: entry.level,
        moveName: entry.move,
        moveLabel: record ? englishName(record) : humanize(entry.move),
        typeName,
        typeLabel: typeName ? (typeLabels.get(typeName) ?? humanize(typeName)) : '',
        category: record?.damage_class?.name ? humanize(record.damage_class.name) : '—',
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null
      };
      if (!rowsByMethod.has(entry.method)) rowsByMethod.set(entry.method, []);
      rowsByMethod.get(entry.method).push(row);
    });
  }

  const methods = [...rowsByMethod.entries()]
    .map(([key, rows]) => ({ key, title: humanize(key), showLevel: key === 'level-up', rows }))
    .sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a.key);
      const ib = METHOD_ORDER.indexOf(b.key);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.title.localeCompare(b.title);
    });

  // Default order: Level Up by level then move name; other tables by move name.
  for (const method of methods) {
    method.rows.sort((a, b) => {
      if (method.showLevel && a.level !== b.level) return a.level - b.level;
      return a.moveLabel.localeCompare(b.moveLabel);
    });
  }

  const stats = (pokemon.stats ?? []).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat
  }));

  const evolutionNode = (node) => ({
    name: node.species.name,
    human: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(evolutionNode)
  });

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  return {
    speciesName: species.name,
    name: englishName(species),
    dex: species.id,
    genus: englishGenus(species),
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        name: t.type.name,
        label: typeLabels.get(t.type.name) ?? humanize(t.type.name)
      })),
    artwork,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, human: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain?.chain ? evolutionNode(chain.chain) : null,
    games: games.map((g) => ({ name: g.name, label: g.label })),
    game: game?.name ?? '',
    methods
  };
}
