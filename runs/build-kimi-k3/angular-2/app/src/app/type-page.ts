import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Cards } from './cards';
import { TypePageData } from './resolvers';
import { NotFoundView } from './not-found-view';
import { routeDataSignal } from './route-data';
import { pageTitle } from './utils';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, Cards, NotFoundView],
  template: `
    @if (data(); as d) {
      <h1>{{ d.englishName }}</h1>

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of d.relations; track relation.term) {
            <div class="relation">
              <dt>{{ relation.term }}</dt>
              <dd>
                @for (type of relation.types; track type.name) {
                  <a class="badge type-{{ type.name }}" [routerLink]="['/types', type.name]">
                    {{ type.label }}
                  </a>
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
        <p class="count">{{ d.pokemon.length }} Pokémon</p>
        <app-cards [cards]="d.pokemon" />
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ d.moves.length }} moves</p>
        <ul class="move-links">
          @for (move of d.moves; track move.name) {
            <li>
              <a [routerLink]="['/moves', move.name]">{{ move.label }}</a>
            </li>
          }
        </ul>
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class TypePage {
  private readonly title = inject(Title);
  readonly data = routeDataSignal<TypePageData | null>('data');

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) this.title.setTitle(pageTitle(d.englishName));
    });
  }
}
