import { error } from '@sveltejs/kit';
import { api, getTypes, getTypeLabelMap, speciesCardsFromRefs } from '#lib/server/api.js';
import { humanize, englishName } from '#lib/utils.js';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from']
];

export async function load({ params }) {
  const type = await api(`type/${encodeURIComponent(params.name)}/`);
  if (!type) error(404, 'Not found');

  const [knownTypes, typeLabels] = await Promise.all([getTypes(), getTypeLabelMap()]);
  // stellar, unknown and shadow are out of scope.
  if (!knownTypes.some((t) => t.name === type.name)) error(404, 'Not found');

  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: (type.damage_relations?.[key] ?? [])
      .filter((t) => typeLabels.has(t.name))
      .map((t) => ({ name: t.name, label: typeLabels.get(t.name) }))
  }));

  const pokemon = await speciesCardsFromRefs(
    (type.pokemon ?? []).map((p) => ({ url: p.pokemon.url }))
  );

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, human: humanize(m.name) }))
    .sort((a, b) => a.human.localeCompare(b.human));

  return {
    name: englishName(type),
    relations,
    pokemon,
    moves
  };
}
