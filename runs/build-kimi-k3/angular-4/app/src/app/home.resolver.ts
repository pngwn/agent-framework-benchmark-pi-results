import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { PokedexData, SpeciesRef } from './pokedex-data';
import { englishName, humanize } from './util';

export interface HomeData {
  species: SpeciesRef[];
  types: { name: string; english: string }[];
  generations: { name: string; english: string }[];
  pokemonTypes: Map<number, { name: string; english: string }[]>;
  generationSpecies: Map<string, Set<string>>;
}

export const homeResolver: ResolveFn<HomeData> = async () => {
  const data = inject(PokedexData);
  const [species, types, generations, pokemonTypes, generationSpecies] = await Promise.all([
    data.speciesList(),
    data.types(),
    data.generations(),
    data.pokemonTypes(),
    data.generationSpecies(),
  ]);
  return {
    species,
    types: types.map((t) => ({ name: t.name, english: englishName(t.names, humanize(t.name)) })),
    generations: generations.map((g) => ({
      name: g.name,
      english: englishName(g.names, humanize(g.name)),
    })),
    pokemonTypes,
    generationSpecies,
  };
};
