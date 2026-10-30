import { getByName, type Ability } from '../api';
import { cardList, cardsFromPokemon, countLine, section } from '../components';
import { h } from '../dom';
import { EM_DASH, englishName, englishShortEffect, latestEnglishFlavorText } from '../format';
import type { PageContext, PageResult } from '../main';

export async function renderAbility({ main }: PageContext, name: string): Promise<PageResult> {
  const ability = await getByName<Ability>('ability', name);
  const cards = await cardsFromPokemon(ability.pokemon, (p) => p.pokemon, (p) => ({ hidden: p.is_hidden }));
  const title = englishName(ability);
  const effect = englishShortEffect(ability.effect_entries) ?? latestEnglishFlavorText(ability.flavor_text_entries) ?? EM_DASH;

  main.append(
    h('h1', null, title),
    section('Effect', [h('p', null, effect)]),
    section('Pokémon', [countLine(cards.length), cards.length ? cardList(cards) : null]),
  );
  return { title };
}
