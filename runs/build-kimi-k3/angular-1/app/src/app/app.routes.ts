import { Routes } from '@angular/router';
import { AbilityPage } from './ability.page';
import { HomePage } from './home.page';
import { MovePage } from './move.page';
import { NotFoundComponent } from './not-found.component';
import {
  abilityResolver,
  homeResolver,
  moveResolver,
  pokemonResolver,
  typeResolver,
  typesResolver,
} from './page-data';
import { PokemonPage } from './pokemon.page';
import { TypePage } from './type.page';
import { TypesPage } from './types.page';

export const routes: Routes = [
  { path: '', component: HomePage, resolve: { data: homeResolver }, title: 'Pokédex' },
  {
    path: 'pokemon/:name',
    component: PokemonPage,
    resolve: { data: pokemonResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  { path: 'moves/:name', component: MovePage, resolve: { data: moveResolver } },
  { path: 'abilities/:name', component: AbilityPage, resolve: { data: abilityResolver } },
  { path: 'types', component: TypesPage, resolve: { data: typesResolver }, title: 'Types – Pokédex' },
  { path: 'types/:name', component: TypePage, resolve: { data: typeResolver } },
  { path: '**', component: NotFoundComponent, title: 'Not found – Pokédex' },
];
