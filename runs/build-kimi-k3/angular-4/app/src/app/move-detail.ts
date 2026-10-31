import { Component, input } from '@angular/core';
import { MovePageData } from './move.resolver';
import { NotFoundView } from './not-found-view';
import { PokemonCards } from './pokemon-cards';
import { TypePill } from './type-pill';
import { orDash } from './util';

/** `/moves/:name` — move details, effect and the Pokémon that learn it. */
@Component({
  imports: [NotFoundView, PokemonCards, TypePill],
  template: `
    @if (data(); as d) {
      <h1>{{ d.heading }}</h1>

      <div class="card">
        <dl class="facts facts-row">
          <div>
            <dt>Type</dt>
            <dd><app-type-pill [name]="d.type.name" [label]="d.type.english" /></dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{{ d.category }}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{{ orDash(d.power) }}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{{ orDash(d.accuracy) }}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{{ orDash(d.pp) }}</dd>
          </div>
        </dl>
      </div>

      <section class="card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ d.effect }}</p>
      </section>

      <section class="card" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{{ d.cards.length }} Pokémon</p>
        <app-pokemon-cards [entries]="d.cards" />
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class MoveDetail {
  readonly data = input.required<MovePageData | null>();
  protected readonly orDash = orDash;
}
