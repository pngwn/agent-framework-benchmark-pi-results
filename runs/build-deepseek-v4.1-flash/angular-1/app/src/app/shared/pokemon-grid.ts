import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dexNumber } from '../core/util';

export interface CardTypeVM {
  name: string;
  label: string;
}

export interface PokemonCardVM {
  id: number;
  name: string;
  displayName: string;
  sprite: string;
  types?: CardTypeVM[];
  hidden?: boolean;
}

@Component({
  selector: 'ul[app-pokemon-grid]',
  imports: [RouterLink],
  template: `
    @for (card of cards(); track card.id) {
      <li class="pokemon-card">
        <a class="pokemon-card-link" [routerLink]="['/pokemon', card.name]">
          <img class="card-sprite" [src]="card.sprite" alt="" width="96" height="96" />
          <span class="dex-number">{{ dex(card.id) }}</span>
          <span class="card-name">{{ card.displayName }}</span>
          @if (card.types?.length) {
            <span class="type-badges">
              @for (type of card.types; track type.name) {
                <span class="type-badge" [attr.data-type]="type.name">{{ type.label }}</span>
              }
            </span>
          }
          @if (card.hidden) {
            <span class="hidden-ability">Hidden ability</span>
          }
        </a>
      </li>
    }
  `,
})
export class PokemonGrid {
  readonly cards = input.required<PokemonCardVM[]>();

  protected dex(id: number): string {
    return dexNumber(id);
  }
}
