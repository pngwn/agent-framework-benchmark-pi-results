import { Component, input } from '@angular/core';
import { AbilityPageData } from './ability.resolver';
import { NotFoundView } from './not-found-view';
import { PokemonCards } from './pokemon-cards';

/** `/abilities/:name` — ability effect and the Pokémon that have it. */
@Component({
  imports: [NotFoundView, PokemonCards],
  template: `
    @if (data(); as d) {
      <h1>{{ d.heading }}</h1>

      <section class="card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ d.effect }}</p>
      </section>

      <section class="card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{{ d.cards.length }} Pokémon</p>
        <app-pokemon-cards [entries]="d.cards" />
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class AbilityDetail {
  readonly data = input.required<AbilityPageData | null>();
}
