import { error } from '@sveltejs/kit';
import { api, cardsForPokemonRefs, englishTypeName } from '#lib/server/api.js';
import {
  englishName,
  englishShortEffect,
  humanize,
  latestEnglishFlavor
} from '#lib/utils.js';

export async function load({ params }) {
  let move;
  try {
    move = await api(`move/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const [typeEn, cards] = await Promise.all([
    move.type?.name ? englishTypeName(move.type.name) : Promise.resolve(null),
    cardsForPokemonRefs(move.learned_by_pokemon ?? [])
  ]);

  const effect =
    englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';

  return {
    view: {
      name: englishName(move.names, humanize(move.name)),
      typeName: move.type?.name ?? null,
      typeEn,
      category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
      effect,
      cards
    }
  };
}
