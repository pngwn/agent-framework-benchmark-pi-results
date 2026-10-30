import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dexNumber } from '../core/helpers';

export interface CardType {
  name: string;
  label: string;
}

@Component({
  selector: 'li[app-pokemon-card]',
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/pokemon', speciesName()]">
      @if (spriteUrl()) {
        <img [src]="spriteUrl()" alt="" width="96" height="96" loading="lazy" />
      } @else {
        <span class="sprite-placeholder" aria-hidden="true"></span>
      }
      <span class="dex-number">{{ dexNumber(id()) }}</span>
      <span class="pokemon-name">{{ displayName() }}</span>
      @if (types().length) {
        <span class="card-types">
          @for (type of types(); track type.name) {
            <span [class]="'type-badge type-' + type.name">{{ type.label }}</span>
          }
        </span>
      }
    </a>
    @if (hiddenAbility()) {
      <p class="hidden-ability">Hidden ability</p>
    }
  `,
})
export class PokemonCard {
  readonly id = input.required<number>();
  readonly speciesName = input.required<string>();
  readonly displayName = input.required<string>();
  readonly spriteUrl = input<string | null | undefined>(null);
  readonly types = input<CardType[]>([]);
  readonly hiddenAbility = input(false);

  protected readonly dexNumber = dexNumber;
}
