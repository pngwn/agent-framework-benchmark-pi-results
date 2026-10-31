import { ResolveFn } from '@angular/router';
import { RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from './api';
import { CardEntry, PokedexData } from './pokedex-data';
import { PokeType } from './models';
import { englishName, humanize } from './util';

export interface TypePageData {
  heading: string;
  relations: { label: string; types: { name: string; english: string }[] }[];
  cards: CardEntry[];
  moves: { name: string; label: string }[];
}

const RELATIONS: [string, keyof PokeType['damage_relations']][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export const typeResolver: ResolveFn<TypePageData | null> = async (route) => {
  const api = inject(Api);
  const data = inject(PokedexData);
  const title = inject(Title);
  const responseInit = inject(RESPONSE_INIT, { optional: true });
  const name = route.paramMap.get('name')!;

  try {
    const [type, typeNames] = await Promise.all([
      api.get<PokeType>(`type/${name}`),
      data.typeNames(),
    ]);
    const heading = englishName(type.names, humanize(type.name));
    title.setTitle(`${heading} – Pokédex`);

    const typeLabel = (ref: { name: string }) => ({
      name: ref.name,
      english: typeNames.get(ref.name) ?? humanize(ref.name),
    });

    return {
      heading,
      relations: RELATIONS.map(([label, key]) => ({
        label,
        types: type.damage_relations[key].map(typeLabel),
      })),
      cards: await data.cardsFor(type.pokemon.map((p) => p.pokemon)),
      moves: type.moves
        .map((m) => ({ name: m.name, label: humanize(m.name) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  } catch {
    title.setTitle('Not found – Pokédex');
    if (responseInit) responseInit.status = 404;
    return null;
  }
};
