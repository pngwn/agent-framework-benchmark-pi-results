import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';
import { PokemonPage } from './pages/pokemon-page/pokemon-page';
import { MovePage } from './pages/move-page/move-page';
import { AbilityPage } from './pages/ability-page/ability-page';
import { TypeListPage } from './pages/type-list-page/type-list-page';
import { TypePage } from './pages/type-page/type-page';
import { NotFoundPage } from './pages/not-found-page/not-found-page';
import {
  abilityResolver,
  homeResolver,
  moveResolver,
  pokemonResolver,
  typeListResolver,
  typeResolver,
} from './api/resolvers';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    resolve: { pageData: homeResolver },
    title: 'Pokédex',
  },
  {
    path: 'pokemon/:name',
    component: PokemonPage,
    resolve: { pageData: pokemonResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'moves/:name',
    component: MovePage,
    resolve: { pageData: moveResolver },
  },
  {
    path: 'abilities/:name',
    component: AbilityPage,
    resolve: { pageData: abilityResolver },
  },
  {
    path: 'types',
    component: TypeListPage,
    resolve: { pageData: typeListResolver },
  },
  {
    path: 'types/:name',
    component: TypePage,
    resolve: { pageData: typeResolver },
  },
  {
    path: '**',
    component: NotFoundPage,
  },
];
