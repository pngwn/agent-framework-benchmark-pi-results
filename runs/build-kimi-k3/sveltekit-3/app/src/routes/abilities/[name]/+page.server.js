import { error } from '@sveltejs/kit';
import { api, speciesCardsFromRefs } from '#lib/server/api.js';
import { englishName } from '#lib/utils.js';

export async function load({ params }) {
  const ability = await api(`ability/${encodeURIComponent(params.name)}/`);
  if (!ability) error(404, 'Not found');

  const effectEntry = (ability.effect_entries ?? []).find((e) => e.language?.name === 'en');
  const effect = effectEntry?.short_effect?.replace(/\s+/g, ' ').trim() || '—';

  const pokemon = await speciesCardsFromRefs(
    (ability.pokemon ?? []).map((p) => ({ url: p.pokemon.url, hidden: p.is_hidden }))
  );

  return {
    name: englishName(ability),
    effect,
    pokemon
  };
}
