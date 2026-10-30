import {
  englishName,
  humanize,
  getType,
  getAllTypes,
  getSpeciesMaps,
  hydrateSprites,
  parseId,
  speciesCardInfo,
} from '../api.js';
import { el, heading, panel, pokemonCard, pokemonGrid, typeBadge } from '../ui.js';

function relationList(refs, labels) {
  if (!refs?.length) return 'None';
  return refs.map((ref) =>
    typeBadge(ref.name, labels.get(ref.name) ?? humanize(ref.name)),
  );
}

export async function renderTypeList(_main, _searchParams, isCurrent) {
  const types = await getAllTypes();
  if (!isCurrent()) return null;

  return {
    title: 'Types – Pokédex',
    content: el(
      'div',
      { class: 'types-page' },
      heading(1, 'Types'),
      el(
        'ul',
        { class: 'type-grid' },
        types.map((type) =>
          el(
            'li',
            {},
            typeBadge(type.name, englishName(type)),
          ),
        ),
      ),
    ),
  };
}

export async function renderType(_main, _searchParams, isCurrent, name) {
  let type;
  try {
    type = await getType(name);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }

  const relations = type.damage_relations ?? {};
  const relatedNames = [
    ...new Set(
      [
        ...(relations.double_damage_to ?? []),
        ...(relations.half_damage_to ?? []),
        ...(relations.no_damage_to ?? []),
        ...(relations.double_damage_from ?? []),
        ...(relations.half_damage_from ?? []),
        ...(relations.no_damage_from ?? []),
      ].map((ref) => ref.name),
    ),
  ];
  const [maps, ...relatedTypes] = await Promise.all([
    getSpeciesMaps(),
    ...relatedNames.map((relatedName) => getType(relatedName)),
  ]);
  if (!isCurrent()) return null;

  const labels = new Map(relatedTypes.map((related) => [related.name, englishName(related)]));
  const displayName = englishName(type);

  const terms = [
    ['Super effective against', relations.double_damage_to],
    ['Not very effective against', relations.half_damage_to],
    ['No effect against', relations.no_damage_to],
    ['Weak to', relations.double_damage_from],
    ['Resists', relations.half_damage_from],
    ['Immune to', relations.no_damage_from],
  ];

  const relationsPanel = panel(
    2,
    'Damage relations',
    'damage-relations',
    el(
      'dl',
      { class: 'relations-grid' },
      terms.map(([term, refs]) =>
        el(
          'div',
          { class: 'relation' },
          el('dt', { text: term }),
          el('dd', {}, relationList(refs, labels)),
        ),
      ),
    ),
  );

  const seen = new Set();
  const infos = [];
  for (const entry of type.pokemon ?? []) {
    const id = parseId(entry.pokemon?.url);
    if (id === null || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    infos.push(speciesCardInfo(entry.pokemon, maps));
  }
  infos.sort((a, b) => a.id - b.id);

  const pokemonPanel = panel(
    2,
    'Pokémon',
    'pokemon',
    el('p', { class: 'count-text', text: `${infos.length} Pokémon` }),
    pokemonGrid(infos.map((info) => pokemonCard(info))),
  );

  const moves = (type.moves ?? [])
    .map((move) => ({ slug: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const movesPanel = panel(
    2,
    'Moves',
    'moves',
    el('p', { class: 'count-text', text: `${moves.length} moves` }),
    el(
      'ul',
      { class: 'link-columns' },
      moves.map((move) =>
        el(
          'li',
          {},
          el('a', {
            href: `/moves/${encodeURIComponent(move.slug)}`,
            text: move.label,
          }),
        ),
      ),
    ),
  );

  return {
    title: `${displayName} – Pokédex`,
    content: el(
      'div',
      { class: 'type-page' },
      heading(1, displayName),
      relationsPanel,
      pokemonPanel,
      movesPanel,
    ),
    afterRender: () => hydrateSprites(infos.map((info) => info.id), pokemonPanel),
  };
}
