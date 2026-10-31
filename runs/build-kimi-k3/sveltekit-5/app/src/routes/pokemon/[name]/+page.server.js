import { error } from '@sveltejs/kit';
import { api, mediaUrl, englishTypeName, mapLimit } from '#lib/server/api.js';
import {
  apiPath,
  englishName,
  humanize,
  dexNumber,
  latestEnglishFlavor,
  urlId,
  STAT_LABELS
} from '#lib/utils.js';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const FETCH_CONCURRENCY = 24;

function evolutionNode(link) {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    href: `/pokemon/${link.species.name}`,
    children: (link.evolves_to ?? []).map(evolutionNode)
  };
}

export async function load({ params, url }) {
  let species;
  try {
    species = await api(`pokemon-species/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  // The species' default Pokémon (same id as the species).
  const defaultVariety = (species.varieties ?? []).find((v) => v.is_default);
  const pokemonId = urlId(defaultVariety?.pokemon.url) ?? species.id;
  const pokemon = await api(`pokemon/${pokemonId}/`);

  const chainPath = apiPath(species.evolution_chain?.url);
  const chainPromise = chainPath ? api(chainPath) : Promise.resolve(null);

  // Version groups in which this Pokémon learns moves, ordered by their order.
  const versionGroupNames = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      versionGroupNames.add(detail.version_group.name);
    }
  }
  const gamesPromise = mapLimit([...versionGroupNames], FETCH_CONCURRENCY, async (name) => {
    const vg = await api(`version-group/${name}/`);
    return { name, order: vg.order, label: humanize(name) };
  });

  const [chain, games] = await Promise.all([chainPromise, gamesPromise]);
  games.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const requestedGame = url.searchParams.get('game');
  const selectedGame = games.some((g) => g.name === requestedGame)
    ? requestedGame
    : games[games.length - 1]?.name;

  // Moves for the selected version group, grouped by learn method.
  const byMethod = new Map();
  const moveNames = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selectedGame) continue;
      const method = detail.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, new Map());
      const entries = byMethod.get(method);
      const key = `${move.move.name}:${detail.level_learned_at}`;
      if (!entries.has(key)) {
        entries.set(key, { move: move.move.name, level: detail.level_learned_at });
        moveNames.add(move.move.name);
      }
    }
  }

  const moveRecords = new Map();
  await mapLimit([...moveNames], FETCH_CONCURRENCY, async (name) => {
    moveRecords.set(name, await api(`move/${name}/`));
  });

  const typeNamesNeeded = new Set(
    [...moveRecords.values()].map((m) => m.type?.name).filter(Boolean)
  );
  const typeEn = new Map();
  await mapLimit([...typeNamesNeeded], FETCH_CONCURRENCY, async (name) => {
    typeEn.set(name, await englishTypeName(name));
  });

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods.map((method) => {
    const hasLevel = method === 'level-up';
    const rows = [...byMethod.get(method).values()].map((entry) => {
      const record = moveRecords.get(entry.move);
      const typeName = record.type?.name ?? null;
      return {
        level: hasLevel ? entry.level : null,
        move: englishName(record.names, humanize(record.name)),
        moveHref: `/moves/${record.name}`,
        type: typeName ? (typeEn.get(typeName) ?? humanize(typeName)) : '—',
        typeName,
        typeHref: typeName ? `/types/${typeName}` : null,
        category: record.damage_class?.name ? humanize(record.damage_class.name) : '—',
        power: record.power ?? null,
        accuracy: record.accuracy ?? null,
        pp: record.pp ?? null
      };
    });
    rows.sort((a, b) => {
      if (hasLevel && a.level !== b.level) return a.level - b.level;
      return a.move.localeCompare(b.move);
    });
    return { method, caption: humanize(method), hasLevel, rows };
  });

  // Summary data.
  const types = await mapLimit(pokemon.types ?? [], FETCH_CONCURRENCY, async (entry) => ({
    name: entry.type.name,
    en: await englishTypeName(entry.type.name),
    href: `/types/${entry.type.name}`,
    slot: entry.slot
  }));
  types.sort((a, b) => a.slot - b.slot);

  const stats = (pokemon.stats ?? []).map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      href: `/abilities/${entry.ability.name}`,
      hidden: entry.is_hidden
    }));

  const name = englishName(species.names, humanize(species.name));
  const genusEntry = (species.genera ?? []).find((g) => g.language?.name === 'en');
  const artwork =
    mediaUrl(pokemon.sprites?.other?.['official-artwork']?.front_default) ??
    mediaUrl(pokemon.sprites?.front_default);

  return {
    view: {
      name,
      dex: dexNumber(species.id),
      genus: genusEntry?.genus ?? null,
      types,
      artwork,
      height: `${(pokemon.height / 10).toFixed(1)} m`,
      weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
      flavor: latestEnglishFlavor(species.flavor_text_entries),
      stats,
      total,
      abilities,
      evolution: chain ? evolutionNode(chain.chain) : null,
      games,
      selectedGame,
      tables
    }
  };
}
