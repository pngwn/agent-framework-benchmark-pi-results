import { ResolveFn } from '@angular/router';
import { RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from './api';
import { CardEntry, PokedexData } from './pokedex-data';
import { Move } from './models';
import { englishName, humanize, latestEnglishFlavor } from './util';

export interface MovePageData {
  heading: string;
  type: { name: string; english: string };
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  cards: CardEntry[];
}

export const moveResolver: ResolveFn<MovePageData | null> = async (route) => {
  const api = inject(Api);
  const data = inject(PokedexData);
  const title = inject(Title);
  const responseInit = inject(RESPONSE_INIT, { optional: true });
  const name = route.paramMap.get('name')!;

  try {
    const [move, typeNames] = await Promise.all([
      api.get<Move>(`move/${name}`),
      data.typeNames(),
    ]);
    const heading = englishName(move.names, humanize(move.name));
    title.setTitle(`${heading} – Pokédex`);

    const effect =
      move.effect_entries.find((e) => e.language.name === 'en')?.short_effect ||
      latestEnglishFlavor(move.flavor_text_entries) ||
      '—';

    return {
      heading,
      type: {
        name: move.type.name,
        english: typeNames.get(move.type.name) ?? humanize(move.type.name),
      },
      category: move.damage_class ? humanize(move.damage_class.name) : '—',
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      effect,
      cards: await data.cardsFor(move.learned_by_pokemon),
    };
  } catch {
    title.setTitle('Not found – Pokédex');
    if (responseInit) responseInit.status = 404;
    return null;
  }
};
