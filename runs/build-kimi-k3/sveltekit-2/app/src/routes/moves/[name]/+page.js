import { error } from '@sveltejs/kit';
import {
  api,
  setBase,
  humanize,
  enName,
  latestEnglishFlavor,
  getSpeciesIndex,
  cardsFromPokemonRefs,
  getTypeEnglishName,
} from '#lib/api.js';

export async function load({ params, parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  let move;
  try {
    move = await api(`move/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const speciesIndex = await getSpeciesIndex();
  const cards = cardsFromPokemonRefs(move.learned_by_pokemon ?? [], speciesIndex);

  const enEffects = (move.effect_entries ?? []).filter((e) => e.language?.name === 'en');
  const effect = enEffects.at(-1)?.short_effect ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';

  return {
    en: enName(move.names) ?? humanize(move.name),
    typeName: move.type.name,
    typeLabel: await getTypeEnglishName(move.type.name),
    category: humanize(move.damage_class.name),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
}
