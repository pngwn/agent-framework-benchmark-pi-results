import { Component, input } from '@angular/core';
import { Card } from './models';
import { PokemonCard } from './pokemon-card';

/** A count line and a grid of Pokémon cards. */
@Component({
  selector: 'app-card-list',
  imports: [PokemonCard],
  template: `
    <p class="count">{{ cards().length }} Pokémon</p>
    <ul class="card-grid">
      @for (card of cards(); track card.id) {
        <li><app-pokemon-card [id]="card.id" [name]="card.name" [hidden]="!!card.hidden" /></li>
      }
    </ul>
  `,
})
export class CardList {
  readonly cards = input.required<Card[]>();
}
