import { Routes } from '@angular/router';
import { Home } from './home';
import { Pokemon } from './pokemon';
import { Move } from './move';
import { Ability } from './ability';
import { Types } from './types';
import { Type } from './type';
import { NotFound } from './not-found';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'pokemon/:name', component: Pokemon },
  { path: 'moves/:name', component: Move },
  { path: 'abilities/:name', component: Ability },
  { path: 'types', component: Types },
  { path: 'types/:name', component: Type },
  { path: '**', component: NotFound },
];
