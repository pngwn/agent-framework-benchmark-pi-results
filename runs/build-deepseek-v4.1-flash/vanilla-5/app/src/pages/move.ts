import { fetchRecord, type ApiRecord } from '../api';
import { cardList, typeBadgeLink } from '../cards';
import { h, section } from '../dom';
import { loadSpeciesByIdMap, parseIdFromRef } from '../data';
import {
  displayNumber,
  englishName,
  flavorWithFallback,
  humanize,
} from '../format';
import type { PageContext } from '../types';

export async function renderMove(ctx: PageContext, name: string): Promise<void> {
  const [move, speciesById] = await Promise.all([
    fetchRecord(`move/${encodeURIComponent(name)}`),
    loadSpeciesByIdMap(),
  ]);
  if (!ctx.isCurrent()) return;

  const titleName = englishName(move, move.name);
  ctx.setTitle(`${titleName} – Pokédex`);

  const summary = h(
    'dl',
    { class: 'move-facts' },
    fact('Type', move.type?.name ? typeBadgeLink(String(move.type.name)) : '—'),
    fact('Category', move.damage_class?.name ? humanize(String(move.damage_class.name)) : '—'),
    fact('Power', displayNumber(move.power)),
    fact('Accuracy', displayNumber(move.accuracy)),
    fact('PP', displayNumber(move.pp)),
  );

  const learned = (move.learned_by_pokemon ?? [])
    .map((ref: ApiRecord) => ({ ref, id: parseIdFromRef(ref) }))
    .filter((entry: { id: number | null }) => entry.id !== null && entry.id <= 10000)
    .sort((a: { id: number | null }, b: { id: number | null }) => Number(a.id) - Number(b.id));

  const seen = new Set<number>();
  const learnedSpecies = learned
    .filter((entry: { id: number | null }) => {
      if (entry.id === null || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .map((entry: { ref: ApiRecord; id: number | null }) => {
      const species = speciesById.get(Number(entry.id));
      return species
        ? { id: species.id, name: species.name }
        : { id: Number(entry.id), name: String(entry.ref.name) };
    });

  const learnedSection = section(
    'learned-by-section',
    'Learned by',
    h('p', { class: 'result-count' }, `${learnedSpecies.length} Pokémon`),
    cardList(learnedSpecies),
  );

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, titleName),
      summary,
      section('effect-section', 'Effect', h('p', {}, flavorWithFallback(move))),
      learnedSection,
    ),
  );
}

function fact(term: string, value: string | Node): HTMLElement {
  return h('div', { class: 'fact' }, h('dt', {}, term), h('dd', {}, value));
}
