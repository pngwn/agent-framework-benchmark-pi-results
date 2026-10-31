import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Cards } from './cards';
import { AbilityPageData } from './resolvers';
import { NotFoundView } from './not-found-view';
import { routeDataSignal } from './route-data';
import { pageTitle } from './utils';

@Component({
  selector: 'app-ability-page',
  imports: [Cards, NotFoundView],
  template: `
    @if (data(); as d) {
      <h1>{{ d.englishName }}</h1>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ d.effect }}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ d.pokemon.length }} Pokémon</p>
        <app-cards [cards]="d.pokemon" />
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class AbilityPage {
  private readonly title = inject(Title);
  readonly data = routeDataSignal<AbilityPageData | null>('data');

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) this.title.setTitle(pageTitle(d.englishName));
    });
  }
}
