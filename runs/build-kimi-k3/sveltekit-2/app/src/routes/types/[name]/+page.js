import { error } from '@sveltejs/kit';
import {
  api,
  setBase,
  humanize,
  enName,
  getSpeciesIndex,
  cardsFromPokemonRefs,
  getTypeEnglishName,
} from '#lib/api.js';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function load({ params, parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  let type;
  try {
    type = await api(`type/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const speciesIndex = await getSpeciesIndex();
  const cards = cardsFromPokemonRefs(type.pokemon ?? [], speciesIndex);

  const relations = await Promise.all(
    RELATIONS.map(async ([label, key]) => ({
      label,
      types: await Promise.all(
        (type.damage_relations?.[key] ?? []).map(async (ref) => ({
          name: ref.name,
          en: await getTypeEnglishName(ref.name),
        })),
      ),
    })),
  );

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    en: enName(type.names) ?? humanize(type.name),
    relations,
    cards,
    moves,
  };
}
