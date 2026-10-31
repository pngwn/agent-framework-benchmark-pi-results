import { error } from '@sveltejs/kit';
import {
  api,
  cardsForPokemonRefs,
  englishTypeName,
  mapLimit,
  EXCLUDED_TYPES
} from '#lib/server/api.js';
import { englishName, humanize } from '#lib/utils.js';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from']
];

export async function load({ params }) {
  if (EXCLUDED_TYPES.has(params.name)) error(404, 'Not found');

  let type;
  try {
    type = await api(`type/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const relatedNames = new Set();
  for (const [, key] of RELATIONS) {
    for (const ref of type.damage_relations?.[key] ?? []) relatedNames.add(ref.name);
  }
  const relatedEn = new Map();
  await mapLimit([...relatedNames], 24, async (name) => {
    relatedEn.set(name, await englishTypeName(name));
  });

  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((ref) => ({
      name: ref.name,
      en: relatedEn.get(ref.name) ?? humanize(ref.name),
      href: `/types/${ref.name}`
    }))
  }));

  const cards = await cardsForPokemonRefs((type.pokemon ?? []).map((p) => p.pokemon));

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name), href: `/moves/${m.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    view: {
      name: englishName(type.names, humanize(type.name)),
      relations,
      cards,
      moves
    }
  };
}
