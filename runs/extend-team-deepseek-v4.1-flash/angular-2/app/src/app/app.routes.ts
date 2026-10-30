import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Routes } from '@angular/router';
import { PageData } from './data/page-data';

/** Resolves the view model for a page from its page data path. */
function pageData(path: (route: ActivatedRouteSnapshot) => string): ResolveFn<unknown> {
  return (route) => inject(PageData).load(path(route));
}

const param = (route: ActivatedRouteSnapshot, name: string) =>
  encodeURIComponent(route.paramMap.get(name) ?? '');

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home'),
    resolve: { vm: pageData(() => '/home') },
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pages/pokemon/pokemon-page'),
    resolve: {
      vm: pageData((route) => {
        const game = route.queryParamMap.get('game');
        return `/pokemon/${param(route, 'name')}${game ? `?game=${encodeURIComponent(game)}` : ''}`;
      }),
    },
    runGuardsAndResolvers: (from, to) =>
      from.paramMap.get('name') !== to.paramMap.get('name') ||
      from.queryParamMap.get('game') !== to.queryParamMap.get('game'),
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./pages/move/move-page'),
    resolve: { vm: pageData((route) => `/moves/${param(route, 'name')}`) },
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./pages/ability/ability-page'),
    resolve: { vm: pageData((route) => `/abilities/${param(route, 'name')}`) },
  },
  {
    path: 'types',
    title: 'Types',
    loadComponent: () => import('./pages/types/types-page'),
    resolve: { vm: pageData(() => '/types') },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type/type-page'),
    resolve: { vm: pageData((route) => `/type/${param(route, 'name')}`) },
  },
  {
    path: 'team',
    title: 'Team',
    loadComponent: () => import('./pages/team/team-page'),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found'),
    data: { notFound: true },
  },
];
