import { getByName, typeNames, type Move } from '../api';
import { cardList, cardsFromPokemon, countLine, section, typeBadge } from '../components';
import { h } from '../dom';
import { EM_DASH, englishName, englishShortEffect, humanize, latestEnglishFlavorText, orDash } from '../format';
import type { PageContext, PageResult } from '../main';

export async function renderMove({ main }: PageContext, name: string): Promise<PageResult> {
  const move = await getByName<Move>('move', name);
  const [labels, cards] = await Promise.all([typeNames([move.type.name]), cardsFromPokemon(move.learned_by_pokemon, (p) => p)]);
  const title = englishName(move);
  const effect = englishShortEffect(move.effect_entries) ?? latestEnglishFlavorText(move.flavor_text_entries) ?? EM_DASH;
  const fact = (term: string, value: Node | string) => h('div', null, h('dt', null, term), h('dd', null, value));

  main.append(
    h('h1', null, title),
    h(
      'dl',
      { class: 'facts facts--panel' },
      fact('Type', typeBadge(move.type.name, labels.get(move.type.name) ?? humanize(move.type.name))),
      fact('Category', move.damage_class ? humanize(move.damage_class.name) : EM_DASH),
      fact('Power', orDash(move.power)),
      fact('Accuracy', orDash(move.accuracy)),
      fact('PP', orDash(move.pp)),
    ),
    section('Effect', [h('p', null, effect)]),
    section('Learned by', [countLine(cards.length), cards.length ? cardList(cards) : null]),
  );
  return { title };
}
