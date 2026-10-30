import { Routes } from '@angular/router';
import { HomePage } from './pages/home';
import { PokemonPage } from './pages/pokemon';
import { MovePage } from './pages/move';
import { AbilityPage } from './pages/ability';
import { TypeListPage } from './pages/type-list';
import { TypePage } from './pages/type';
import { NotFoundPage } from './pages/not-found';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  { path: 'pokemon/:name', component: PokemonPage },
  { path: 'moves/:name', component: MovePage },
  { path: 'abilities/:name', component: AbilityPage },
  { path: 'types', pathMatch: 'full', component: TypeListPage },
  { path: 'types/:name', component: TypePage },
  { path: '**', component: NotFoundPage },
];
