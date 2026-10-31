import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from './api';
import { CardEntry } from './pokedex-data';
import { dexNumber, humanize } from './util';

/**
 * A list of Pokémon cards: one list item per card, each a link to the species
 * page containing the front sprite, dex number and humanized name.
 */
@Component({
  selector: 'app-pokemon-cards',
  imports: [RouterLink],
  template: `
    <ul class="cards">
      @for (entry of entries(); track entry.id) {
        <li>
          <a class="pokemon-card" [routerLink]="['/pokemon', entry.name]">
            <img [src]="sprite(entry.id)" alt="" width="96" height="96" />
            <span class="pokemon-card-dex">{{ dex(entry.id) }}</span>
            <span class="pokemon-card-name">{{ humanize(entry.name) }}</span>
            @if (entry.types.length) {
              <span class="pokemon-card-types">
                @for (type of entry.types; track type.name) {
                  <span class="type-badge type-{{ type.name }}">{{ type.english }}</span>
                }
              </span>
            }
            @if (entry.note) {
              <span class="pokemon-card-note">{{ entry.note }}</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
})
export class PokemonCards {
  readonly entries = input.required<CardEntry[]>();

  private readonly api = inject(Api);
  protected readonly humanize = humanize;
  protected readonly dex = dexNumber;

  protected sprite(id: number): string {
    return this.api.spriteUrl(id);
  }
}
