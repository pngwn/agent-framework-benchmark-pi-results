import { Routes } from '@angular/router';
import { abilityResolver } from './ability';
import { homeResolver } from './home';
import { moveResolver } from './move';
import { pokemonResolver } from './pokemon';
import { typeResolver } from './type-page';
import { typesResolver } from './types-page';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home').then((m) => m.Home),
    resolve: { vm: homeResolver },
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pokemon').then((m) => m.PokemonPage),
    resolve: { vm: pokemonResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./move').then((m) => m.MovePage),
    resolve: { vm: moveResolver },
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./ability').then((m) => m.AbilityPage),
    resolve: { vm: abilityResolver },
  },
  {
    path: 'types',
    loadComponent: () => import('./types-page').then((m) => m.TypesPage),
    resolve: { vm: typesResolver },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./type-page').then((m) => m.TypePage),
    resolve: { vm: typeResolver },
  },
  {
    path: '**',
    loadComponent: () => import('./not-found').then((m) => m.NotFoundPage),
  },
];
