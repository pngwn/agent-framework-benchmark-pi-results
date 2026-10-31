import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PokemonCardsComponent } from './cards.component';
import { NotFoundComponent } from './not-found.component';
import { AbilityPageData } from './page-data';

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCardsComponent, NotFoundComponent],
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
        <app-pokemon-cards [cards]="d.pokemon" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-4);
    }
    section p {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbilityPage {
  protected readonly data = input.required<AbilityPageData | null>();

  constructor() {
    const title = inject(Title);
    effect(() => {
      const data = this.data();
      title.setTitle(data ? `${data.englishName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
