import { Component, computed, inject, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../data/page-data';
import { dexNumber, humanize } from './format';
import { NamedRef } from './models';
import { TypeBadge } from './type-badge';

@Component({
  selector: 'app-pokemon-card',
  imports: [RouterLink, NgOptimizedImage, TypeBadge],
  template: `
    <a class="pokemon-card" [routerLink]="['/pokemon', name()]">
      <span class="pokemon-card__sprite">
        @if (!spriteMissing()) {
          <img [ngSrc]="sprite()" width="96" height="96" alt="" [priority]="priority()" (error)="spriteMissing.set(true)" />
        }
      </span>
      <span class="pokemon-card__number">{{ number() }}</span>
      <span class="pokemon-card__name">{{ label() }}</span>
      @if (types().length) {
        <span class="pokemon-card__types">
          @for (type of types(); track type.name) {
            <app-type-badge [type]="type" [link]="false" />
          }
        </span>
      }
      @if (hidden()) {
        <span class="pokemon-card__note">Hidden ability</span>
      }
    </a>
  `,
  host: { style: 'display: contents' },
})
export class PokemonCard {
  private readonly apiBase = inject(API_BASE_URL);

  readonly id = input.required<number>();
  readonly name = input.required<string>();
  readonly types = input<NamedRef[]>([]);
  readonly hidden = input(false);
  readonly priority = input(false);

  protected readonly spriteMissing = signal(false);
  protected readonly number = computed(() => dexNumber(this.id()));
  protected readonly label = computed(() => humanize(this.name()));
  protected readonly sprite = computed(() => `${this.apiBase}/media/sprites/pokemon/${this.id()}.png`);
}
