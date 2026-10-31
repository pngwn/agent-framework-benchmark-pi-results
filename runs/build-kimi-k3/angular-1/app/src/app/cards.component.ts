import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokemonCardData } from './catalog.service';
import { PokeApi } from './pokeapi.service';
import { dexNumber } from './util';

/** A list of Pokémon cards: links with sprite, dex number and humanized name. */
@Component({
  selector: 'app-pokemon-cards',
  imports: [RouterLink],
  template: `
    <ul class="cards">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img class="card-sprite" [src]="sprite(card.id)" alt="" width="96" height="96" loading="lazy" />
            <span class="card-dex">{{ dex(card.id) }}</span>
            <span class="card-name">{{ card.humanName }}</span>
            @if (showTypes() && card.types.length) {
              <span class="card-types">
                @for (type of card.types; track type.name) {
                  <span class="type-badge type-{{ type.name }}">{{ type.english }}</span>
                }
              </span>
            }
            @if (card.hidden) {
              <span class="card-hidden">Hidden ability</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './cards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardsComponent {
  readonly cards = input.required<PokemonCardData[]>();
  readonly showTypes = input(false);

  private readonly api = inject(PokeApi);
  protected readonly dex = dexNumber;

  protected sprite(id: number): string {
    return this.api.media(`sprites/pokemon/${id}.png`);
  }
}
