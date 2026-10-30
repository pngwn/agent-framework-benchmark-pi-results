import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PokedexData } from './pokedex-data';
import {
  AbilityPageData,
  HomePageData,
  MovePageData,
  PokemonPageData,
  TypeListPageData,
  TypePageData,
} from './page-data.models';

async function nullable<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

export const homeResolver: ResolveFn<HomePageData> = () => inject(PokedexData).getHomeData();

export const pokemonResolver: ResolveFn<PokemonPageData | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const name = route.paramMap.get('name') ?? '';
  const game = route.queryParamMap.get('game');
  return nullable(() => inject(PokedexData).getPokemonPage(name, game));
};

export const moveResolver: ResolveFn<MovePageData | null> = (route: ActivatedRouteSnapshot) => {
  const name = route.paramMap.get('name') ?? '';
  return nullable(() => inject(PokedexData).getMovePage(name));
};

export const abilityResolver: ResolveFn<AbilityPageData | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const name = route.paramMap.get('name') ?? '';
  return nullable(() => inject(PokedexData).getAbilityPage(name));
};

export const typeListResolver: ResolveFn<TypeListPageData> = () =>
  inject(PokedexData).getTypeListPage();

export const typeResolver: ResolveFn<TypePageData | null> = (route: ActivatedRouteSnapshot) => {
  const name = route.paramMap.get('name') ?? '';
  return nullable(() => inject(PokedexData).getTypePage(name));
};
