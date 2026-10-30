import { Component, inject, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PokedexData } from '../core/pokedex-data';
import { NotFound } from '../shared/not-found';

@Component({
  selector: 'app-type-list-page',
  imports: [RouterLink, NotFound],
  template: `
    @if (types.hasValue()) {
      <h1 class="page-title">Types</h1>
      <ul class="type-grid">
        @for (type of types.value(); track type.name) {
          <li>
            <a [routerLink]="['/types', type.name]" [class]="'type-badge type-pill type-' + type.name">
              {{ type.label }}
            </a>
          </li>
        }
      </ul>
    } @else if (types.error()) {
      <app-not-found />
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
})
export class TypeListPage {
  private readonly title = inject(Title);
  private readonly pokedex = inject(PokedexData);

  protected readonly types = resource({
    loader: () => this.pokedex.getAllTypes(),
  });

  constructor() {
    this.title.setTitle('Types – Pokédex');
  }
}
