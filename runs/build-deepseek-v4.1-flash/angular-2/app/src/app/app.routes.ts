import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pages/pokemon/pokemon').then((m) => m.PokemonPage),
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./pages/move/move').then((m) => m.MovePage),
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./pages/ability/ability').then((m) => m.AbilityPage),
  },
  {
    path: 'types',
    loadComponent: () => import('./pages/types/types').then((m) => m.TypesPage),
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type/type').then((m) => m.TypePage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
