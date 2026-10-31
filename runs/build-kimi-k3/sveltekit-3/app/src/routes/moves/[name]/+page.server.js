import { error } from '@sveltejs/kit';
import { api, getTypeLabelMap, speciesCardsFromRefs } from '#lib/server/api.js';
import { humanize, englishName, latestEnglishFlavor } from '#lib/utils.js';

export async function load({ params }) {
  const move = await api(`move/${encodeURIComponent(params.name)}/`);
  if (!move) error(404, 'Not found');

  const [typeLabels, learned] = await Promise.all([
    getTypeLabelMap(),
    speciesCardsFromRefs((move.learned_by_pokemon ?? []).map((p) => ({ url: p.url })))
  ]);

  const effectEntry = (move.effect_entries ?? []).find((e) => e.language?.name === 'en');
  const effect =
    effectEntry?.short_effect?.replace(/\s+/g, ' ').trim() ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    '—';

  const typeName = move.type?.name ?? '';

  return {
    name: englishName(move),
    typeName,
    typeLabel: typeName ? (typeLabels.get(typeName) ?? humanize(typeName)) : '—',
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? '—',
    accuracy: move.accuracy ?? '—',
    pp: move.pp ?? '—',
    effect,
    learned
  };
}
