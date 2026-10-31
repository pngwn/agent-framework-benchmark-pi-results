import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardData } from './dex.service';
import { dexNumber } from './utils';

/** A list of Pokémon cards: sprite, dex number and humanized species name per list item. */
@Component({
  selector: 'app-cards',
  imports: [RouterLink],
  template: `
    <ul class="card-grid">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img [src]="card.sprite" alt="" width="96" height="96" />
            <span class="dex">{{ dexNumber(card.id) }}</span>
            <span class="name">{{ card.label }}</span>
            @if (card.types?.length) {
              <span class="badges">
                @for (type of card.types; track type.name) {
                  <span class="badge type-{{ type.name }}">{{ type.label }}</span>
                }
              </span>
            }
            @if (card.hidden) {
              <span class="hidden-note">Hidden ability</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
})
export class Cards {
  readonly cards = input.required<CardData[]>();
  protected readonly dexNumber = dexNumber;
}
