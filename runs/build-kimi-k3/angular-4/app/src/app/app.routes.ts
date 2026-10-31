import { Routes } from '@angular/router';
import { homeResolver } from './home.resolver';
import { pokemonResolver } from './pokemon.resolver';
import { moveResolver } from './move.resolver';
import { abilityResolver } from './ability.resolver';
import { typesResolver } from './types.resolver';
import { typeResolver } from './type.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home').then((m) => m.Home),
    resolve: { data: homeResolver },
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pokemon-detail').then((m) => m.PokemonDetail),
    resolve: { data: pokemonResolver },
    // Re-resolve when the `game` query parameter changes.
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./move-detail').then((m) => m.MoveDetail),
    resolve: { data: moveResolver },
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./ability-detail').then((m) => m.AbilityDetail),
    resolve: { data: abilityResolver },
  },
  {
    path: 'types',
    loadComponent: () => import('./type-list').then((m) => m.TypeList),
    resolve: { data: typesResolver },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./type-detail').then((m) => m.TypeDetail),
    resolve: { data: typeResolver },
  },
  {
    path: '**',
    loadComponent: () => import('./not-found').then((m) => m.NotFound),
  },
];
