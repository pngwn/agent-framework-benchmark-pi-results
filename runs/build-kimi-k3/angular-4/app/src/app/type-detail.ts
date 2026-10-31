import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TypePageData } from './type.resolver';
import { NotFoundView } from './not-found-view';
import { PokemonCards } from './pokemon-cards';
import { TypePill } from './type-pill';

/** `/types/:name` — damage relations, Pokémon and moves of one type. */
@Component({
  imports: [RouterLink, NotFoundView, PokemonCards, TypePill],
  template: `
    @if (data(); as d) {
      <h1>{{ d.heading }}</h1>

      <section class="card" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of d.relations; track relation.label) {
            <div class="relation">
              <dt>{{ relation.label }}</dt>
              <dd>
                @if (relation.types.length) {
                  @for (type of relation.types; track type.name) {
                    <app-type-pill [name]="type.name" [label]="type.english" />
                  }
                } @else {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{{ d.cards.length }} Pokémon</p>
        <app-pokemon-cards [entries]="d.cards" />
      </section>

      <section class="card" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="result-count">{{ d.moves.length }} moves</p>
        <ul class="moves-list">
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
export class TypeDetail {
  readonly data = input.required<TypePageData | null>();
}
