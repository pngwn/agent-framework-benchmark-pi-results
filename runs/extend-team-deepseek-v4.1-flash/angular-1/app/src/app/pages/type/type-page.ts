import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardList } from '../../shared/card-list';
import { TypeVM } from '../../shared/models';
import { TypeBadge } from '../../shared/type-badge';
import NotFound from '../not-found/not-found';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, CardList, TypeBadge, NotFound],
  template: `
    @if (vm(); as vm) {
      <h1 class="page-title">{{ vm.title }}</h1>
      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of vm.relations; track relation.label) {
            <div>
              <dt>{{ relation.label }}</dt>
              <dd>
                @for (type of relation.types; track type.name) {
                  <app-type-badge [type]="type" />
                } @empty {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>
      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <app-card-list [cards]="vm.pokemon" />
      </section>
      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ vm.moves.length }} moves</p>
        <ul class="link-columns">
          @for (move of vm.moves; track move.name) {
            <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
          }
        </ul>
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export default class TypePage {
  readonly vm = input.required<TypeVM | null>();
}
