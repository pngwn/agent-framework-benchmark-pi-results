import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokeApi, TypeMembership } from '../core/poke-api';
import { dexNumber, humanize } from '../core/format';

@Component({
  selector: 'li[app-pokemon-card]',
  imports: [RouterLink],
  template: `
    <a class="card-link" [routerLink]="['/pokemon', speciesName()]">
      <img class="sprite" [src]="sprite()" [alt]="''" width="96" height="96" loading="lazy" />
      <span class="dex">{{ dex() }}</span>
      <span class="name">{{ label() }}</span>
      @if (types().length) {
        <span class="type-badge-list">
          @for (type of types(); track type.name) {
            <span [class]="'type-badge type-' + type.name">{{ type.label }}</span>
          }
        </span>
      }
    </a>
    @if (hidden()) {
      <span class="hidden-label">Hidden ability</span>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .card-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      height: 100%;
      min-height: 10.5rem;
      padding: var(--space-4) var(--space-2);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      text-decoration: none;
      text-align: center;
    }

    .sprite {
      width: var(--sprite-size);
      height: var(--sprite-size);
      object-fit: contain;
      image-rendering: auto;
    }

    .dex {
      margin-top: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .label,
    .name {
      margin-top: 0.15rem;
      font-size: 0.95rem;
      line-height: 1.3;
    }

    .type-badge-list {
      margin-top: 0.45rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.25rem;
    }

    .type-badge-list .type-badge {
      min-width: 0;
      padding: 0.1rem 0.55rem;
      font-size: 0.72rem;
    }

    .hidden-label {
      display: block;
      margin-top: 0.15rem;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      text-align: center;
    }
  `,
})
export class PokemonCard {
  private readonly api = inject(PokeApi);

  readonly speciesName = input.required<string>();
  readonly dexId = input.required<number>();
  readonly types = input<TypeMembership[]>([]);
  readonly hidden = input(false);

  readonly label = computed(() => humanize(this.speciesName()));
  readonly dex = computed(() => dexNumber(this.dexId()));
  readonly sprite = computed(() => this.api.spriteUrl(this.dexId()));
}
