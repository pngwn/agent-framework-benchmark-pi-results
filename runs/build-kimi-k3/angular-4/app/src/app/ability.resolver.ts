import { ResolveFn } from '@angular/router';
import { RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from './api';
import { CardEntry, PokedexData } from './pokedex-data';
import { Ability } from './models';
import { englishName, humanize } from './util';

export interface AbilityPageData {
  heading: string;
  effect: string;
  cards: CardEntry[];
}

export const abilityResolver: ResolveFn<AbilityPageData | null> = async (route) => {
  const api = inject(Api);
  const data = inject(PokedexData);
  const title = inject(Title);
  const responseInit = inject(RESPONSE_INIT, { optional: true });
  const name = route.paramMap.get('name')!;

  try {
    const ability = await api.get<Ability>(`ability/${name}`);
    const heading = englishName(ability.names, humanize(ability.name));
    title.setTitle(`${heading} – Pokédex`);

    const notes = new Map(
      ability.pokemon
        .filter((p) => p.is_hidden)
        .map((p) => [p.pokemon.name, 'Hidden ability'] as const),
    );

    return {
      heading,
      effect:
        ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect || '—',
      cards: await data.cardsFor(
        ability.pokemon.map((p) => p.pokemon),
        notes,
      ),
    };
  } catch {
    title.setTitle('Not found – Pokédex');
    if (responseInit) responseInit.status = 404;
    return null;
  }
};
