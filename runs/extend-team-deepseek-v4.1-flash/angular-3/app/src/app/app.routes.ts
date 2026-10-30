import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Routes } from '@angular/router';
import { PageData } from './data/page-data';
import { TeamStore } from './data/team-store';
import { TeamVM } from './shared/models';

/** Resolves the view model for a page from its page data path. */
function pageData(path: (route: ActivatedRouteSnapshot) => string): ResolveFn<unknown> {
  return (route) => inject(PageData).load(path(route));
}

const param = (route: ActivatedRouteSnapshot, name: string) =>
  encodeURIComponent(route.paramMap.get(name) ?? '');

/** The team lives in the browser, so its resolver reads the names from the browser (or its cookie). */
const teamData: ResolveFn<TeamVM | null> = () => {
  const names = inject(TeamStore).names();
  const query = names.map((name) => `names=${encodeURIComponent(name)}`).join('&');
  return inject(PageData).load<TeamVM>(`/team${query ? `?${query}` : ''}`);
};

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
    path: 'team',
    title: 'Team',
    loadComponent: () => import('./pages/team/team-page'),
    resolve: { vm: teamData },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type/type-page'),
    resolve: { vm: pageData((route) => `/type/${param(route, 'name')}`) },
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found'),
    data: { notFound: true },
  },
];
