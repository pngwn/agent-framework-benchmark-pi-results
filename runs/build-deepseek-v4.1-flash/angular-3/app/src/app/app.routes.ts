import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home-page').then((m) => m.HomePage),
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pages/pokemon-page').then((m) => m.PokemonPage),
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./pages/move-page').then((m) => m.MovePage),
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./pages/ability-page').then((m) => m.AbilityPage),
  },
  {
    path: 'types',
    pathMatch: 'full',
    loadComponent: () => import('./pages/type-list-page').then((m) => m.TypeListPage),
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type-page').then((m) => m.TypePage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found-page').then((m) => m.NotFoundPage),
  },
];
