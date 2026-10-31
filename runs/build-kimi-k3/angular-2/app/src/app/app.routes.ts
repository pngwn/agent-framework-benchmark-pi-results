import { Routes } from '@angular/router';
import { Home } from './home';
import { PokemonPage } from './pokemon-page';
import { MovePage } from './move-page';
import { AbilityPage } from './ability-page';
import { TypesPage } from './types-page';
import { TypePage } from './type-page';
import { NotFoundPage } from './not-found-page';
import {
  abilityResolver,
  homeResolver,
  moveResolver,
  pokemonResolver,
  typeResolver,
  typesResolver,
} from './resolvers';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home, resolve: { home: homeResolver } },
  {
    path: 'pokemon/:name',
    component: PokemonPage,
    resolve: { data: pokemonResolver },
    runGuardsAndResolvers: 'pathParamsOrQueryParamsChange',
  },
  { path: 'moves/:name', component: MovePage, resolve: { data: moveResolver } },
  { path: 'abilities/:name', component: AbilityPage, resolve: { data: abilityResolver } },
  { path: 'types', component: TypesPage, resolve: { data: typesResolver } },
  { path: 'types/:name', component: TypePage, resolve: { data: typeResolver } },
  { path: '**', component: NotFoundPage },
];
