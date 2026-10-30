import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page';
import { PokemonPage } from './pages/pokemon-page';
import { MovePage } from './pages/move-page';
import { AbilityPage } from './pages/ability-page';
import { TypeListPage } from './pages/type-list-page';
import { TypePage } from './pages/type-page';
import { NotFoundPage } from './pages/not-found-page';

export const routes: Routes = [
  { path: '', component: HomePage, pathMatch: 'full' },
  { path: 'pokemon/:name', component: PokemonPage },
  { path: 'moves/:name', component: MovePage },
  { path: 'abilities/:name', component: AbilityPage },
  { path: 'types', component: TypeListPage },
  { path: 'types/:name', component: TypePage },
  { path: '**', component: NotFoundPage },
];
