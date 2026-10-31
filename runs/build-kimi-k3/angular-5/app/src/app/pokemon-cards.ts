import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_BASE, dexNumber, humanize } from './api';

export interface CardType {
  name: string;
  enName: string;
}

export interface PokemonCard {
  /** Species (dex) number. */
  id: number;
  /** Species API name. */
  name: string;
  /** Extra muted text shown under the name (e.g. `Hidden ability`). */
  extra?: string;
  /** Types shown as badges, in slot order (home page only). */
  types?: CardType[];
}

@Component({
  selector: 'app-pokemon-cards',
  imports: [RouterLink],
  template: `
    <ul class="cards">
      @for (card of cards(); track card.id) {
        <li class="card">
          <a [routerLink]="['/pokemon', card.name]">
            <img [src]="sprite(card.id)" alt="" width="96" height="96" loading="lazy" />
            <span class="dex">{{ dexNumber(card.id) }}</span>
            <span class="name">{{ humanize(card.name) }}</span>
            @if (card.types?.length) {
              <span class="badges">
                @for (type of card.types; track type.name) {
                  <span class="badge type-{{ type.name }}">{{ type.enName }}</span>
                }
              </span>
            }
            @if (card.extra) {
              <span class="extra">{{ card.extra }}</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './pokemon-cards.css',
})
export class PokemonCards {
  readonly cards = input.required<PokemonCard[]>();

  protected readonly dexNumber = dexNumber;
  protected readonly humanize = humanize;

  protected sprite(id: number): string {
    return `${API_BASE}/media/sprites/pokemon/${id}.png`;
  }
}
