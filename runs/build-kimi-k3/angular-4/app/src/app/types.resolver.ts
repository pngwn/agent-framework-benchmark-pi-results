import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { PokedexData } from './pokedex-data';
import { englishName, humanize } from './util';

export interface TypeListData {
  types: { name: string; english: string }[];
}

export const typesResolver: ResolveFn<TypeListData> = async () => {
  const data = inject(PokedexData);
  const types = await data.types();
  return {
    types: types.map((t) => ({ name: t.name, english: englishName(t.names, humanize(t.name)) })),
  };
};
